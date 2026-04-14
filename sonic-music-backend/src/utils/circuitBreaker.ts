import { logger } from './logger';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxCalls: number;
}

const DEFAULT_OPTIONS: CircuitBreakerOptions = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxCalls: 3,
};

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailureTime: number;
  state: CircuitState;
  halfOpenCalls: number;
}

class CircuitBreaker {
  private stats: Map<string, CircuitStats> = new Map();
  private options: CircuitBreakerOptions;

  constructor(options: Partial<CircuitBreakerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  private getStats(key: string): CircuitStats {
    if (!this.stats.has(key)) {
      this.stats.set(key, {
        failures: 0,
        successes: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
        halfOpenCalls: 0,
      });
    }
    return this.stats.get(key)!;
  }

  private setStats(key: string, stats: CircuitStats): void {
    this.stats.set(key, stats);
  }

  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const stats = this.getStats(key);

    if (stats.state === 'OPEN') {
      const timeSinceFailure = Date.now() - stats.lastFailureTime;
      
      if (timeSinceFailure >= this.options.resetTimeoutMs) {
        stats.state = 'HALF_OPEN';
        stats.halfOpenCalls = 0;
        this.setStats(key, stats);
        logger.info('Circuit breaker half-open', { key });
      } else {
        logger.warn('Circuit breaker open, using fallback', { key });
        if (fallback) {
          return fallback();
        }
        throw new Error(`Circuit breaker is open for ${key}`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess(key, stats);
      return result;
    } catch (error) {
      this.onFailure(key, stats);
      
      if (fallback && stats.state === 'OPEN') {
        logger.info('Using fallback after circuit opened', { key });
        return fallback();
      }
      
      throw error;
    }
  }

  private onSuccess(key: string, stats: CircuitStats): void {
    stats.failures = 0;
    stats.successes++;

    if (stats.state === 'HALF_OPEN') {
      stats.halfOpenCalls++;
      
      if (stats.halfOpenCalls >= this.options.halfOpenMaxCalls) {
        stats.state = 'CLOSED';
        stats.halfOpenCalls = 0;
        logger.info('Circuit breaker closed', { key });
      }
    }

    this.setStats(key, stats);
  }

  private onFailure(key: string, stats: CircuitStats): void {
    stats.failures++;
    stats.lastFailureTime = Date.now();

    if (stats.state === 'HALF_OPEN') {
      stats.state = 'OPEN';
      logger.warn('Circuit breaker reopened', { key });
    } else if (stats.failures >= this.options.failureThreshold) {
      stats.state = 'OPEN';
      logger.warn('Circuit breaker opened', { key, failures: stats.failures });
    }

    this.setStats(key, stats);
  }

  getState(key: string): CircuitState {
    return this.getStats(key).state;
  }

  reset(key: string): void {
    this.stats.delete(key);
    logger.info('Circuit breaker reset', { key });
  }

  resetAll(): void {
    this.stats.clear();
    logger.info('All circuit breakers reset');
  }
}

export const circuitBreaker = new CircuitBreaker();

export function withCircuitBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  fallback?: () => Promise<T>
): Promise<T> {
  return circuitBreaker.execute(key, fn, fallback);
}
