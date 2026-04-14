import { logger } from './logger';

export interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  factor: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 500,
  maxDelayMs: 5000,
  factor: 2,
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.initialDelayMs;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === opts.maxRetries) {
        logger.error('Max retries reached', { 
          attempts: attempt + 1, 
          error: lastError.message 
        });
        throw lastError;
      }

      const jitter = Math.random() * 100;
      const actualDelay = Math.min(delay + jitter, opts.maxDelayMs);
      
      logger.warn('Retrying after error', { 
        attempt: attempt + 1, 
        delay: actualDelay,
        error: lastError.message 
      });

      await new Promise(resolve => setTimeout(resolve, actualDelay));
      delay *= opts.factor;
    }
  }

  throw lastError;
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Request timed out'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });

  return Promise.race([promise, timeout]).catch((err) => {
    logger.error(errorMessage, { timeoutMs: ms, error: err.message });
    throw err;
  });
}
