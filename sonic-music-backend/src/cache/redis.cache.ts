import Redis from 'ioredis';
import { logger } from '../utils/logger';

const MEMORY_CACHE_TTL = 60 * 1000;

class MemoryCache {
  private cache = new Map<string, { data: string; expires: number }>();

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, value: string, ttlSeconds: number): void {
    this.cache.set(key, {
      data: value,
      expires: Date.now() + ttlSeconds * 1000,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

class CacheManager {
  private redis: Redis | null = null;
  private memoryCache = new MemoryCache();
  private redisUrl = process.env.REDIS_URL;
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    if (this.redisUrl) {
      try {
        this.redis = new Redis(this.redisUrl, {
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          reconnectOnError: () => true,
        });

        this.redis.on('error', (err) => {
          logger.error('Redis connection error', { error: err.message });
        });

        this.redis.on('connect', () => {
          logger.info('Redis connected successfully');
        });

        await this.redis.connect();
        this.initialized = true;
        logger.info('Cache manager initialized with Redis');
      } catch (err) {
        logger.warn('Failed to connect to Redis, using memory fallback', {
          error: (err as Error).message,
        });
        this.initialized = true;
      }
    } else {
      logger.info('No REDIS_URL provided, using memory cache');
      this.initialized = true;
    }
  }

  private getRedis(): Redis | null {
    return this.redis;
  }

  async get<T>(key: string): Promise<T | null> {
    const memResult = this.memoryCache.get(key);
    if (memResult) {
      logger.debug('Cache hit (memory)', { key });
      return JSON.parse(memResult) as T;
    }

    const redis = this.getRedis();
    if (redis) {
      try {
        const data = await redis.get(key);
        if (data) {
          logger.debug('Cache hit (redis)', { key });
          this.memoryCache.set(key, data, MEMORY_CACHE_TTL / 1000);
          return JSON.parse(data) as T;
        }
      } catch (err) {
        logger.warn('Redis get failed', { key, error: (err as Error).message });
      }
    }

    logger.debug('Cache miss', { key });
    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const serialized = JSON.stringify(value);

    this.memoryCache.set(key, serialized, ttlSeconds);

    const redis = this.getRedis();
    if (redis) {
      try {
        await redis.setex(key, ttlSeconds, serialized);
      } catch (err) {
        logger.warn('Redis set failed', { key, error: (err as Error).message });
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    const redis = this.getRedis();
    if (redis) {
      try {
        await redis.del(key);
      } catch (err) {
        logger.warn('Redis delete failed', { key });
      }
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const redis = this.getRedis();
    if (redis) {
      try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (err) {
        logger.warn('Redis invalidate failed', { pattern });
      }
    }
    logger.info('Cache invalidated', { pattern });
  }
}

export const cache = new CacheManager();
export { MEMORY_CACHE_TTL };