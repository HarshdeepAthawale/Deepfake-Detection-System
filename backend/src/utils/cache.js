/**
 * Cache Utility
 * Redis caching layer with graceful fallback if Redis unavailable
 */

import config from '../config/env.js';
import logger from './logger.js';

let redisClient = null;
let cacheEnabled = false;

/**
 * Initialize Redis client
 * @returns {Promise<boolean>} True if Redis is available, false otherwise
 */
export const initializeCache = async () => {
  try {
    // Try to import ioredis
    let Redis;
    try {
      const redisModule = await import('ioredis');
      Redis = redisModule.default || redisModule;
    } catch (importError) {
      logger.warn('[CACHE] ioredis not installed, caching disabled');
      cacheEnabled = false;
      redisClient = null;
      return false;
    }
    
    redisClient = new Redis(config.redis.url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
      connectTimeout: 5000,
    });
    
    redisClient.on('error', (err) => {
      logger.warn('[CACHE] Redis error:', err.message);
      cacheEnabled = false;
    });

    redisClient.on('connect', () => {
      logger.info('[CACHE] Redis connected');
      cacheEnabled = true;
    });

    redisClient.on('ready', () => {
      logger.info('[CACHE] Redis ready');
      cacheEnabled = true;
    });

    // Test connection with ping
    await redisClient.ping();
    cacheEnabled = true;
    logger.info('[CACHE] Cache system initialized');
    return true;
  } catch (error) {
    // Redis not available or connection failed - graceful fallback
    logger.warn('[CACHE] Redis not available, caching disabled:', error.message);
    cacheEnabled = false;
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (e) {
        // Ignore quit errors
      }
      redisClient = null;
    }
    return false;
  }
};

/**
 * Get value from cache
 * @param {string} key - Cache key
 * @returns {Promise<any>} Cached value or null
 */
export const get = async (key) => {
  if (!cacheEnabled || !redisClient) {
    return null;
  }

  try {
    const value = await redisClient.get(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (error) {
    logger.warn(`[CACHE] Get error for key ${key}:`, error.message);
    return null;
  }
};

/**
 * Set value in cache
 * @param {string} key - Cache key
 * @param {any} value - Value to cache
 * @param {number} ttlSeconds - Time to live in seconds (optional)
 * @returns {Promise<boolean>} True if cached, false otherwise
 */
export const set = async (key, value, ttlSeconds = null) => {
  if (!cacheEnabled || !redisClient) {
    return false;
  }

  try {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setex(key, ttlSeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
    return true;
  } catch (error) {
    logger.warn(`[CACHE] Set error for key ${key}:`, error.message);
    return false;
  }
};

/**
 * Delete value from cache
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} True if deleted, false otherwise
 */
export const del = async (key) => {
  if (!cacheEnabled || !redisClient) {
    return false;
  }

  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.warn(`[CACHE] Delete error for key ${key}:`, error.message);
    return false;
  }
};

/**
 * Delete multiple keys matching pattern
 * @param {string} pattern - Key pattern (e.g., 'scan:*')
 * @returns {Promise<number>} Number of keys deleted
 */
export const delPattern = async (pattern) => {
  if (!cacheEnabled || !redisClient) {
    return 0;
  }

  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length === 0) {
      return 0;
    }
    const deleted = await redisClient.del(...keys);
    return deleted;
  } catch (error) {
    logger.warn(`[CACHE] Delete pattern error for ${pattern}:`, error.message);
    return 0;
  }
};

/**
 * Check if cache is enabled
 * @returns {boolean} True if cache is enabled
 */
export const isEnabled = () => {
  return cacheEnabled;
};

/**
 * Generate cache key with namespace
 * @param {string} namespace - Namespace (e.g., 'scan', 'admin')
 * @param {string} key - Cache key
 * @returns {string} Full cache key
 */
export const makeKey = (namespace, key) => {
  return `${namespace}:${key}`;
};

/**
 * Cache wrapper function
 * Executes function and caches result, or returns cached value if available
 * @param {string} key - Cache key
 * @param {Function} fn - Function to execute if cache miss
 * @param {number} ttlSeconds - Time to live in seconds
 * @returns {Promise<any>} Cached or fresh value
 */
export const cached = async (key, fn, ttlSeconds = 300) => {
  // Try to get from cache
  const cached = await get(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - execute function
  const value = await fn();
  
  // Cache the result
  await set(key, value, ttlSeconds);
  
  return value;
};

/**
 * Invalidate cache keys
 * @param {string|string[]} keys - Key(s) to invalidate
 * @returns {Promise<void>}
 */
export const invalidate = async (keys) => {
  if (!Array.isArray(keys)) {
    keys = [keys];
  }
  
  for (const key of keys) {
    await del(key);
  }
};

/**
 * Close Redis connection
 */
export const close = async () => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('[CACHE] Redis connection closed');
    } catch (error) {
      logger.warn('[CACHE] Error closing Redis connection:', error.message);
    }
    redisClient = null;
    cacheEnabled = false;
  }
};

export default {
  initializeCache,
  get,
  set,
  del,
  delPattern,
  isEnabled,
  makeKey,
  cached,
  invalidate,
  close,
};
