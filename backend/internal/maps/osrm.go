package maps

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// OSRMClient handles OSRM API calls
type OSRMClient struct {
	baseURL string
	client  *http.Client
}

// OSRMResult represents an OSRM API response
type OSRMResult struct {
	Distance float64 `json:"distance"` // meters
	Duration float64 `json:"duration"` // seconds
	Geometry string  `json:"geometry"` // encoded polyline
}

// OSRMResponse represents the full OSRM response
type OSRMResponse struct {
	Code   string `json:"code"`
	Routes []struct {
		Distance float64 `json:"distance"`
		Duration float64 `json:"duration"`
		Geometry string  `json:"geometry"`
	} `json:"routes"`
}

// NewOSRMClient creates a new OSRM client
func NewOSRMClient(baseURL string) *OSRMClient {
	if baseURL == "" {
		baseURL = "https://router.project-osrm.org"
	}

	return &OSRMClient{
		baseURL: baseURL,
		client:  &http.Client{},
	}
}

// GetRoute gets a route using OSRM
func (oc *OSRMClient) GetRoute(coordinates [][]float64) (*OSRMResult, error) {
	if len(coordinates) < 2 {
		return nil, fmt.Errorf("at least 2 coordinates required")
	}

	// Build coordinates string: "lng,lat;lng,lat;..."
	var coordPairs []string
	for _, coord := range coordinates {
		if len(coord) != 2 {
			return nil, fmt.Errorf("invalid coordinate format")
		}
		coordPairs = append(coordPairs, fmt.Sprintf("%f,%f", coord[0], coord[1]))
	}
	coordStr := strings.Join(coordPairs, ";")

	// Build URL
	routeURL := fmt.Sprintf("%s/route/v1/driving/%s?overview=full&geometries=polyline",
		oc.baseURL,
		coordStr,
	)

	// Make request
	resp, err := oc.client.Get(routeURL)
	if err != nil {
		return nil, fmt.Errorf("osrm request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("osrm returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var osrmResp OSRMResponse
	if err := json.NewDecoder(resp.Body).Decode(&osrmResp); err != nil {
		return nil, fmt.Errorf("failed to parse osrm response: %w", err)
	}

	if osrmResp.Code != "Ok" {
		return nil, fmt.Errorf("osrm returned error code: %s", osrmResp.Code)
	}

	if len(osrmResp.Routes) == 0 {
		return nil, fmt.Errorf("no routes found")
	}

	route := osrmResp.Routes[0]
	return &OSRMResult{
		Distance: route.Distance,
		Duration: route.Duration,
		Geometry: route.Geometry,
	}, nil
}
