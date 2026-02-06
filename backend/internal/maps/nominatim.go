package maps

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// NominatimClient handles Nominatim API calls
type NominatimClient struct {
	baseURL string
	client  *http.Client
}

// NominatimResult represents a Nominatim API response
type NominatimResult struct {
	Lat         float64 `json:"lat,string"`
	Lng         float64 `json:"lon,string"`
	DisplayName string  `json:"display_name"`
	Address     string  `json:"display_name"` // For reverse geocoding
}

// NewNominatimClient creates a new Nominatim client
func NewNominatimClient(baseURL string) *NominatimClient {
	if baseURL == "" {
		baseURL = "https://nominatim.openstreetmap.org"
	}

	return &NominatimClient{
		baseURL: baseURL,
		client:  &http.Client{},
	}
}

// Geocode geocodes an address using Nominatim
func (nc *NominatimClient) Geocode(address string) (*NominatimResult, error) {
	// Build URL
	geocodeURL := fmt.Sprintf("%s/search?q=%s&format=json&limit=1",
		nc.baseURL,
		url.QueryEscape(address),
	)

	// Make request
	resp, err := nc.client.Get(geocodeURL)
	if err != nil {
		return nil, fmt.Errorf("nominatim request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("nominatim returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var results []NominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&results); err != nil {
		return nil, fmt.Errorf("failed to parse nominatim response: %w", err)
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no results found for address: %s", address)
	}

	return &results[0], nil
}

// ReverseGeocode reverse geocodes coordinates using Nominatim
func (nc *NominatimClient) ReverseGeocode(lat, lng float64) (*NominatimResult, error) {
	// Build URL
	reverseURL := fmt.Sprintf("%s/reverse?lat=%f&lon=%f&format=json",
		nc.baseURL,
		lat,
		lng,
	)

	// Make request
	resp, err := nc.client.Get(reverseURL)
	if err != nil {
		return nil, fmt.Errorf("nominatim request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("nominatim returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var result NominatimResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("failed to parse nominatim response: %w", err)
	}

	return &result, nil
}
