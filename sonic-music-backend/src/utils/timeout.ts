import { logger } from './logger';

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