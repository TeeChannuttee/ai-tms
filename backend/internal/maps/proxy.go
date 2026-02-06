package maps

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"regexp"
	"strings"
	"time"

	"github.com/ai-tms/backend/internal/cache"
)

// GeocodeRequest represents a geocoding request
type GeocodeRequest struct {
	Address string `json:"address" binding:"required"`
}

// GeocodeResponse represents a geocoding response
type GeocodeResponse struct {
	Lat          float64 `json:"lat"`
	Lng          float64 `json:"lng"`
	DisplayName  string  `json:"display_name"`
	Cached       bool    `json:"cached"`
	ResponseTime int64   `json:"response_time_ms"`
}

// ReverseGeocodeRequest represents a reverse geocoding request
type ReverseGeocodeRequest struct {
	Lat float64 `json:"lat" binding:"required"`
	Lng float64 `json:"lng" binding:"required"`
}

// ReverseGeocodeResponse represents a reverse geocoding response
type ReverseGeocodeResponse struct {
	Address      string `json:"address"`
	DisplayName  string `json:"display_name"`
	Cached       bool   `json:"cached"`
	ResponseTime int64  `json:"response_time_ms"`
}

// RouteRequest represents a routing request
type RouteRequest struct {
	Coordinates [][]float64 `json:"coordinates" binding:"required,min=2"` // [[lng, lat], ...]
}

// RouteResponse represents a routing response
type RouteResponse struct {
	Distance     float64 `json:"distance"` // meters
	Duration     float64 `json:"duration"` // seconds
	Geometry     string  `json:"geometry"` // encoded polyline
	Cached       bool    `json:"cached"`
	ResponseTime int64   `json:"response_time_ms"`
}

// CacheKeyGenerator generates cache keys for different request types
type CacheKeyGenerator struct{}

// NewCacheKeyGenerator creates a new cache key generator
func NewCacheKeyGenerator() *CacheKeyGenerator {
	return &CacheKeyGenerator{}
}

// GeocodeKey generates a cache key for geocoding
func (ckg *CacheKeyGenerator) GeocodeKey(address string) string {
	normalized := normalizeAddress(address)
	return fmt.Sprintf("maps:geocode:%s", normalized)
}

// ReverseGeocodeKey generates a cache key for reverse geocoding
func (ckg *CacheKeyGenerator) ReverseGeocodeKey(lat, lng float64) string {
	latRounded := roundCoord(lat)
	lngRounded := roundCoord(lng)
	return fmt.Sprintf("maps:reverse:%.4f:%.4f", latRounded, lngRounded)
}

// RouteKey generates a cache key for routing
func (ckg *CacheKeyGenerator) RouteKey(coordinates [][]float64) string {
	// Create hash of coordinates
	coordStr := fmt.Sprintf("%v", coordinates)
	hash := sha256.Sum256([]byte(coordStr))
	hashStr := hex.EncodeToString(hash[:8]) // Use first 8 bytes
	return fmt.Sprintf("maps:route:%s", hashStr)
}

// normalizeAddress normalizes an address for consistent caching
func normalizeAddress(addr string) string {
	// Convert to lowercase
	addr = strings.ToLower(addr)

	// Trim spaces
	addr = strings.TrimSpace(addr)

	// Replace multiple spaces with single space
	re := regexp.MustCompile(`\s+`)
	addr = re.ReplaceAllString(addr, " ")

	// Remove common punctuation that doesn't affect geocoding
	addr = strings.ReplaceAll(addr, ",", "")
	addr = strings.ReplaceAll(addr, ".", "")

	return addr
}

// roundCoord rounds a coordinate to 4 decimal places (~11 meters precision)
func roundCoord(coord float64) float64 {
	return math.Round(coord*10000) / 10000
}

// MapsProxyService handles maps operations with caching and rate limiting
type MapsProxyService struct {
	cache       *cache.CacheManager
	rateLimiter *RateLimiter
	keyGen      *CacheKeyGenerator
	nominatim   *NominatimClient
	osrm        *OSRMClient
}

// NewMapsProxyService creates a new maps proxy service
func NewMapsProxyService(nominatimURL, osrmURL string, nominatimRate, osrmRate float64) *MapsProxyService {
	return &MapsProxyService{
		cache:       cache.NewCacheManager(),
		rateLimiter: NewRateLimiter(nominatimRate, osrmRate),
		keyGen:      NewCacheKeyGenerator(),
		nominatim:   NewNominatimClient(nominatimURL),
		osrm:        NewOSRMClient(osrmURL),
	}
}

// Geocode geocodes an address with caching
func (s *MapsProxyService) Geocode(address string) (*GeocodeResponse, error) {
	startTime := time.Now()

	// Generate cache key
	cacheKey := s.keyGen.GeocodeKey(address)

	// Check cache
	cached, err := s.cache.Get(cacheKey)
	if err == nil && cached != "" {
		var resp GeocodeResponse
		if err := json.Unmarshal([]byte(cached), &resp); err == nil {
			resp.Cached = true
			resp.ResponseTime = time.Since(startTime).Milliseconds()
			return &resp, nil
		}
	}

	// Wait for rate limit token
	s.rateLimiter.WaitNominatim()

	// Call Nominatim
	result, err := s.nominatim.Geocode(address)
	if err != nil {
		return nil, fmt.Errorf("nominatim geocode failed: %w", err)
	}

	// Build response
	resp := &GeocodeResponse{
		Lat:          result.Lat,
		Lng:          result.Lng,
		DisplayName:  result.DisplayName,
		Cached:       false,
		ResponseTime: time.Since(startTime).Milliseconds(),
	}

	// Cache response (30 days)
	respJSON, _ := json.Marshal(resp)
	s.cache.Set(cacheKey, string(respJSON), 30*24*time.Hour)

	return resp, nil
}

// ReverseGeocode reverse geocodes coordinates with caching
func (s *MapsProxyService) ReverseGeocode(lat, lng float64) (*ReverseGeocodeResponse, error) {
	startTime := time.Now()

	// Generate cache key
	cacheKey := s.keyGen.ReverseGeocodeKey(lat, lng)

	// Check cache
	cached, err := s.cache.Get(cacheKey)
	if err == nil && cached != "" {
		var resp ReverseGeocodeResponse
		if err := json.Unmarshal([]byte(cached), &resp); err == nil {
			resp.Cached = true
			resp.ResponseTime = time.Since(startTime).Milliseconds()
			return &resp, nil
		}
	}

	// Wait for rate limit token
	s.rateLimiter.WaitNominatim()

	// Call Nominatim
	result, err := s.nominatim.ReverseGeocode(lat, lng)
	if err != nil {
		return nil, fmt.Errorf("nominatim reverse geocode failed: %w", err)
	}

	// Build response
	resp := &ReverseGeocodeResponse{
		Address:      result.Address,
		DisplayName:  result.DisplayName,
		Cached:       false,
		ResponseTime: time.Since(startTime).Milliseconds(),
	}

	// Cache response (30 days)
	respJSON, _ := json.Marshal(resp)
	s.cache.Set(cacheKey, string(respJSON), 30*24*time.Hour)

	return resp, nil
}

// GetRoute gets a route with caching
func (s *MapsProxyService) GetRoute(coordinates [][]float64) (*RouteResponse, error) {
	startTime := time.Now()

	// Generate cache key
	cacheKey := s.keyGen.RouteKey(coordinates)

	// Check cache
	cached, err := s.cache.Get(cacheKey)
	if err == nil && cached != "" {
		var resp RouteResponse
		if err := json.Unmarshal([]byte(cached), &resp); err == nil {
			resp.Cached = true
			resp.ResponseTime = time.Since(startTime).Milliseconds()
			return &resp, nil
		}
	}

	// Wait for rate limit token
	s.rateLimiter.WaitOSRM()

	// Call OSRM
	result, err := s.osrm.GetRoute(coordinates)
	if err != nil {
		return nil, fmt.Errorf("osrm route failed: %w", err)
	}

	// Build response
	resp := &RouteResponse{
		Distance:     result.Distance,
		Duration:     result.Duration,
		Geometry:     result.Geometry,
		Cached:       false,
		ResponseTime: time.Since(startTime).Milliseconds(),
	}

	// Cache response (7 days)
	respJSON, _ := json.Marshal(resp)
	s.cache.Set(cacheKey, string(respJSON), 7*24*time.Hour)

	return resp, nil
}
