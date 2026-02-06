package cache

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var ctx = context.Background()

// RedisClient is the global Redis client
var RedisClient *redis.Client

// ConnectRedis initializes the Redis connection
func ConnectRedis(host, port, password string, db int) error {
	RedisClient = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: password,
		DB:       db,
	})

	// Test connection
	_, err := RedisClient.Ping(ctx).Result()
	if err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return nil
}

// CacheManager handles Redis caching operations
type CacheManager struct {
	client *redis.Client
}

// NewCacheManager creates a new cache manager
func NewCacheManager() *CacheManager {
	return &CacheManager{
		client: RedisClient,
	}
}

// Get retrieves a value from cache
func (cm *CacheManager) Get(key string) (string, error) {
	val, err := cm.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return "", nil // Cache miss
	}
	if err != nil {
		return "", fmt.Errorf("cache get error: %w", err)
	}
	return val, nil
}

// Set stores a value in cache with TTL
func (cm *CacheManager) Set(key string, value string, ttl time.Duration) error {
	err := cm.client.Set(ctx, key, value, ttl).Err()
	if err != nil {
		return fmt.Errorf("cache set error: %w", err)
	}
	return nil
}

// Delete removes a value from cache
func (cm *CacheManager) Delete(key string) error {
	err := cm.client.Del(ctx, key).Err()
	if err != nil {
		return fmt.Errorf("cache delete error: %w", err)
	}
	return nil
}

// Exists checks if a key exists in cache
func (cm *CacheManager) Exists(key string) (bool, error) {
	count, err := cm.client.Exists(ctx, key).Result()
	if err != nil {
		return false, fmt.Errorf("cache exists error: %w", err)
	}
	return count > 0, nil
}

// GetStats returns cache statistics
func (cm *CacheManager) GetStats() (map[string]string, error) {
	info, err := cm.client.Info(ctx, "stats").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get cache stats: %w", err)
	}

	return map[string]string{
		"info": info,
	}, nil
}

// FlushAll clears all cache (use with caution!)
func (cm *CacheManager) FlushAll() error {
	err := cm.client.FlushAll(ctx).Err()
	if err != nil {
		return fmt.Errorf("cache flush error: %w", err)
	}
	return nil
}
