package services

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
)

// EventType defines the types of real-time events
type EventType string

const (
	EventLocationUpdate EventType = "LOCATION_UPDATE"
	EventStatusUpdate   EventType = "STATUS_UPDATE"
	EventAlertUpdate    EventType = "ALERT_UPDATE"
)

// RealtimeEvent represents an event pushed to clients
type RealtimeEvent struct {
	Type    EventType   `json:"type"`
	Payload interface{} `json:"payload"`
}

// EventService handles real-time broadcasting
type EventService struct {
	clients map[chan RealtimeEvent]bool
	mu      sync.RWMutex
}

var (
	GlobalEventService *EventService
	once               sync.Once
)

// GetEventService returns the singleton instance
func GetEventService() *EventService {
	once.Do(func() {
		GlobalEventService = &EventService{
			clients: make(map[chan RealtimeEvent]bool),
		}
	})
	return GlobalEventService
}

// Subscribe adds a new client channel
func (s *EventService) Subscribe() chan RealtimeEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	ch := make(chan RealtimeEvent, 10)
	s.clients[ch] = true
	return ch
}

// Unsubscribe removes a client channel
func (s *EventService) Unsubscribe(ch chan RealtimeEvent) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.clients, ch)
	close(ch)
}

// Broadcast sends an event to all connected clients
func (s *EventService) Broadcast(eventType EventType, payload interface{}) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	event := RealtimeEvent{
		Type:    eventType,
		Payload: payload,
	}

	for ch := range s.clients {
		select {
		case ch <- event:
		default:
			// Buffer full, skip or handle
		}
	}
}

// SSEHandler handles Server-Sent Events connections
func (s *EventService) SSEHandler(w http.ResponseWriter, r *http.Request) {
	// Set headers for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	messageChan := s.Subscribe()
	defer s.Unsubscribe(messageChan)

	// Close connection when client disconnects
	notify := r.Context().Done()

	for {
		select {
		case <-notify:
			return
		case event := <-messageChan:
			data, _ := json.Marshal(event)
			fmt.Fprintf(w, "data: %s\n\n", data)
			flusher.Flush()
		}
	}
}
