package maps

import (
	"math"
	"sync"
	"time"
)

// TokenBucket implements a token bucket rate limiter
type TokenBucket struct {
	tokens     float64
	capacity   float64
	refillRate float64 // tokens per second
	lastRefill time.Time
	mu         sync.Mutex
}

// NewTokenBucket creates a new token bucket rate limiter
func NewTokenBucket(capacity float64, refillRate float64) *TokenBucket {
	return &TokenBucket{
		tokens:     capacity,
		capacity:   capacity,
		refillRate: refillRate,
		lastRefill: time.Now(),
	}
}

// Allow checks if a request is allowed and consumes a token if so
func (tb *TokenBucket) Allow() bool {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	tb.refill()

	if tb.tokens >= 1.0 {
		tb.tokens -= 1.0
		return true
	}

	return false
}

// Wait blocks until a token is available
func (tb *TokenBucket) Wait() {
	for {
		if tb.Allow() {
			return
		}
		// Sleep for a short time before retrying
		time.Sleep(100 * time.Millisecond)
	}
}

// refill adds tokens based on elapsed time
func (tb *TokenBucket) refill() {
	now := time.Now()
	elapsed := now.Sub(tb.lastRefill).Seconds()

	// Add tokens based on elapsed time
	tb.tokens = math.Min(tb.capacity, tb.tokens+elapsed*tb.refillRate)
	tb.lastRefill = now
}

// GetAvailableTokens returns the current number of available tokens
func (tb *TokenBucket) GetAvailableTokens() float64 {
	tb.mu.Lock()
	defer tb.mu.Unlock()

	tb.refill()
	return tb.tokens
}

// RateLimiter manages rate limiters for different services
type RateLimiter struct {
	nominatim *TokenBucket
	osrm      *TokenBucket
}

// NewRateLimiter creates a new rate limiter with service-specific limits
func NewRateLimiter(nominatimRate, osrmRate float64) *RateLimiter {
	return &RateLimiter{
		nominatim: NewTokenBucket(10.0, nominatimRate), // Capacity: 10 tokens
		osrm:      NewTokenBucket(20.0, osrmRate),      // Capacity: 20 tokens
	}
}

// AllowNominatim checks if a Nominatim request is allowed
func (rl *RateLimiter) AllowNominatim() bool {
	return rl.nominatim.Allow()
}

// WaitNominatim blocks until a Nominatim request is allowed
func (rl *RateLimiter) WaitNominatim() {
	rl.nominatim.Wait()
}

// AllowOSRM checks if an OSRM request is allowed
func (rl *RateLimiter) AllowOSRM() bool {
	return rl.osrm.Allow()
}

// WaitOSRM blocks until an OSRM request is allowed
func (rl *RateLimiter) WaitOSRM() {
	rl.osrm.Wait()
}

// GetStats returns rate limiter statistics
func (rl *RateLimiter) GetStats() map[string]float64 {
	return map[string]float64{
		"nominatim_tokens": rl.nominatim.GetAvailableTokens(),
		"osrm_tokens":      rl.osrm.GetAvailableTokens(),
	}
}
