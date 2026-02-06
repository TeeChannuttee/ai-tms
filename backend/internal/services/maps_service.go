package services

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// MapsService handles OpenStreetMap API interactions
type MapsService struct {
	httpClient   *http.Client
	nominatimURL string
	osrmURL      string
}

// RouteInfo represents route information
type RouteInfo struct {
	Distance     float64       // in kilometers
	Duration     time.Duration // estimated duration
	Polyline     string        // encoded polyline
	Steps        []RouteStep
	TrafficDelay time.Duration // always 0 for OSM (no real-time traffic)
}

// RouteStep represents a step in the route
type RouteStep struct {
	Distance      float64
	Duration      time.Duration
	Instruction   string
	StartLocation LatLng
	EndLocation   LatLng
}

// LatLng represents a geographic coordinate
type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// DistanceMatrixResult represents distance matrix results
type DistanceMatrixResult struct {
	Origins      []string
	Destinations []string
	Rows         []DistanceMatrixRow
}

// DistanceMatrixRow represents a row in distance matrix
type DistanceMatrixRow struct {
	Elements []DistanceMatrixElement
}

// DistanceMatrixElement represents an element in distance matrix
type DistanceMatrixElement struct {
	Distance float64 // in kilometers
	Duration time.Duration
	Status   string
}

// NewMapsService creates a new Maps service using OpenStreetMap
func NewMapsService(nominatimURL, osrmURL string) (*MapsService, error) {
	// Use public servers if not specified
	if nominatimURL == "" {
		nominatimURL = "https://nominatim.openstreetmap.org"
	}
	if osrmURL == "" {
		osrmURL = "https://router.project-osrm.org"
	}

	return &MapsService{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		nominatimURL: nominatimURL,
		osrmURL:      osrmURL,
	}, nil
}

// GetRoute retrieves route information between two points
func (s *MapsService) GetRoute(origin, destination string, departureTime time.Time) (*RouteInfo, error) {
	// First geocode origin and destination
	originCoords, err := s.Geocode(origin)
	if err != nil {
		return nil, fmt.Errorf("failed to geocode origin: %w", err)
	}

	destCoords, err := s.Geocode(destination)
	if err != nil {
		return nil, fmt.Errorf("failed to geocode destination: %w", err)
	}

	// Get route from OSRM
	routeURL := fmt.Sprintf("%s/route/v1/driving/%f,%f;%f,%f?overview=full&steps=true",
		s.osrmURL,
		originCoords.Lng, originCoords.Lat,
		destCoords.Lng, destCoords.Lat,
	)

	resp, err := s.httpClient.Get(routeURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get route: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var osrmResp struct {
		Code   string `json:"code"`
		Routes []struct {
			Distance float64 `json:"distance"` // in meters
			Duration float64 `json:"duration"` // in seconds
			Geometry string  `json:"geometry"` // polyline
			Legs     []struct {
				Distance float64 `json:"distance"`
				Duration float64 `json:"duration"`
				Steps    []struct {
					Distance    float64   `json:"distance"`
					Duration    float64   `json:"duration"`
					Name        string    `json:"name"`
					Instruction string    `json:"maneuver"`
					Location    []float64 `json:"location"`
				} `json:"steps"`
			} `json:"legs"`
		} `json:"routes"`
	}

	if err := json.Unmarshal(body, &osrmResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if osrmResp.Code != "Ok" || len(osrmResp.Routes) == 0 {
		return nil, fmt.Errorf("no routes found")
	}

	route := osrmResp.Routes[0]
	steps := make([]RouteStep, 0)

	// Extract steps
	for _, leg := range route.Legs {
		for _, step := range leg.Steps {
			instruction := step.Name
			if instruction == "" {
				instruction = "Continue"
			}

			steps = append(steps, RouteStep{
				Distance:    step.Distance / 1000.0, // Convert to km
				Duration:    time.Duration(step.Duration) * time.Second,
				Instruction: instruction,
				StartLocation: LatLng{
					Lat: step.Location[1],
					Lng: step.Location[0],
				},
				EndLocation: LatLng{
					Lat: step.Location[1],
					Lng: step.Location[0],
				},
			})
		}
	}

	return &RouteInfo{
		Distance:     route.Distance / 1000.0, // Convert to km
		Duration:     time.Duration(route.Duration) * time.Second,
		Polyline:     route.Geometry,
		Steps:        steps,
		TrafficDelay: 0, // OSM doesn't provide real-time traffic
	}, nil
}

// GetDistanceMatrix retrieves distance matrix for multiple origins and destinations
func (s *MapsService) GetDistanceMatrix(origins, destinations []string) (*DistanceMatrixResult, error) {
	// Geocode all origins and destinations
	originCoords := make([]LatLng, len(origins))
	for i, origin := range origins {
		coords, err := s.Geocode(origin)
		if err != nil {
			return nil, fmt.Errorf("failed to geocode origin %d: %w", i, err)
		}
		originCoords[i] = *coords
	}

	destCoords := make([]LatLng, len(destinations))
	for i, dest := range destinations {
		coords, err := s.Geocode(dest)
		if err != nil {
			return nil, fmt.Errorf("failed to geocode destination %d: %w", i, err)
		}
		destCoords[i] = *coords
	}

	// Build coordinates string for OSRM table API
	var coordsStr strings.Builder
	for i, coord := range originCoords {
		if i > 0 {
			coordsStr.WriteString(";")
		}
		coordsStr.WriteString(fmt.Sprintf("%f,%f", coord.Lng, coord.Lat))
	}
	for _, coord := range destCoords {
		coordsStr.WriteString(";")
		coordsStr.WriteString(fmt.Sprintf("%f,%f", coord.Lng, coord.Lat))
	}

	// Build sources and destinations indices
	sources := make([]string, len(origins))
	for i := range origins {
		sources[i] = fmt.Sprintf("%d", i)
	}
	dests := make([]string, len(destinations))
	for i := range destinations {
		dests[i] = fmt.Sprintf("%d", i+len(origins))
	}

	tableURL := fmt.Sprintf("%s/table/v1/driving/%s?sources=%s&destinations=%s",
		s.osrmURL,
		coordsStr.String(),
		strings.Join(sources, ";"),
		strings.Join(dests, ";"),
	)

	resp, err := s.httpClient.Get(tableURL)
	if err != nil {
		return nil, fmt.Errorf("failed to get distance matrix: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var osrmResp struct {
		Code      string      `json:"code"`
		Distances [][]float64 `json:"distances"` // in meters
		Durations [][]float64 `json:"durations"` // in seconds
	}

	if err := json.Unmarshal(body, &osrmResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if osrmResp.Code != "Ok" {
		return nil, fmt.Errorf("OSRM error: %s", osrmResp.Code)
	}

	// Convert to our format
	rows := make([]DistanceMatrixRow, len(origins))
	for i := range origins {
		elements := make([]DistanceMatrixElement, len(destinations))
		for j := range destinations {
			elements[j] = DistanceMatrixElement{
				Distance: osrmResp.Distances[i][j] / 1000.0, // Convert to km
				Duration: time.Duration(osrmResp.Durations[i][j]) * time.Second,
				Status:   "OK",
			}
		}
		rows[i] = DistanceMatrixRow{Elements: elements}
	}

	return &DistanceMatrixResult{
		Origins:      origins,
		Destinations: destinations,
		Rows:         rows,
	}, nil
}

// Geocode converts an address to coordinates using Nominatim
func (s *MapsService) Geocode(address string) (*LatLng, error) {
	// Rate limiting for public Nominatim server (1 req/sec)
	time.Sleep(1 * time.Second)

	geocodeURL := fmt.Sprintf("%s/search?q=%s&format=json&limit=1",
		s.nominatimURL,
		url.QueryEscape(address),
	)

	req, err := http.NewRequest("GET", geocodeURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Nominatim requires User-Agent
	req.Header.Set("User-Agent", "AI-TMS/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to geocode: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	var results []struct {
		Lat string `json:"lat"`
		Lon string `json:"lon"`
	}

	if err := json.Unmarshal(body, &results); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no results found for address: %s", address)
	}

	var lat, lng float64
	fmt.Sscanf(results[0].Lat, "%f", &lat)
	fmt.Sscanf(results[0].Lon, "%f", &lng)

	return &LatLng{
		Lat: lat,
		Lng: lng,
	}, nil
}

// ReverseGeocode converts coordinates to an address using Nominatim
func (s *MapsService) ReverseGeocode(lat, lng float64) (string, error) {
	// Rate limiting for public Nominatim server (1 req/sec)
	time.Sleep(1 * time.Second)

	reverseURL := fmt.Sprintf("%s/reverse?lat=%f&lon=%f&format=json",
		s.nominatimURL,
		lat, lng,
	)

	req, err := http.NewRequest("GET", reverseURL, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	// Nominatim requires User-Agent
	req.Header.Set("User-Agent", "AI-TMS/1.0")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to reverse geocode: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	var result struct {
		DisplayName string `json:"display_name"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if result.DisplayName == "" {
		return "", fmt.Errorf("no address found for coordinates")
	}

	return result.DisplayName, nil
}

// CalculateETA calculates estimated time of arrival
func (s *MapsService) CalculateETA(origin, destination string, departureTime time.Time) (time.Time, error) {
	route, err := s.GetRoute(origin, destination, departureTime)
	if err != nil {
		return time.Time{}, err
	}

	// No traffic delay with OSM
	eta := departureTime.Add(route.Duration)
	return eta, nil
}
