import { logger } from '../utils/logger';

const LOG_FILE_PATH = './api-debug.log';

interface LogEntry {
  timestamp: string;
  endpoint: string;
  method: string;
  status?: number;
  requestBody?: any;
  responseBody?: any;
  error?: string;
  duration?: number;
}

class FileLogger {
  private static fs: any = null;
  private static initialized = false;

  private static async ensureFs() {
    if (this.initialized) return;
    try {
      const fs = await import('fs');
      this.fs = fs.default || fs;
      this.initialized = true;
    } catch {
      console.warn('Could not import fs module');
    }
  }

  static async log(entry: LogEntry) {
    await this.ensureFs();
    if (!this.fs) return;

    const logLine = JSON.stringify(entry) + '\n';
    
    try {
      if (this.fs.existsSync(LOG_FILE_PATH)) {
        const stats = this.fs.statSync(LOG_FILE_PATH);
        if (stats.size > 10 * 1024 * 1024) {
          this.fs.writeFileSync(LOG_FILE_PATH, '');
        }
      }
      
      this.fs.appendFileSync(LOG_FILE_PATH, logLine);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  static logRequest(endpoint: string, method: string, requestBody?: any) {
    this.log({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      requestBody,
    });
  }

  static logResponse(endpoint: string, method: string, status: number, responseBody: any, duration: number) {
    const bodyStr = typeof responseBody === 'object' 
      ? JSON.stringify(responseBody)?.slice(0, 1000) 
      : String(responseBody);
    
    this.log({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      status,
      responseBody: bodyStr,
      duration,
    });
  }

  static logError(endpoint: string, method: string, error: any, duration?: number) {
    this.log({
      timestamp: new Date().toISOString(),
      endpoint,
      method,
      error: String(error),
      duration,
    });
  }
}

export async function withRequestLogging<T>(
  endpoint: string,
  method: string,
  handler: () => Promise<T>,
  requestBody?: any
): Promise<T> {
  const startTime = Date.now();
  
  FileLogger.logRequest(endpoint, method, requestBody);

  try {
    const result = await handler();
    const duration = Date.now() - startTime;
    
    if (result instanceof Response) {
      const clonedResult = result.clone();
      const body = await clonedResult.json().catch(() => 'Could not parse body');
      FileLogger.logResponse(endpoint, method, result.status, body, duration);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    FileLogger.logError(endpoint, method, error, duration);
    throw error;
  }
}

export function createLoggedHandler(
  endpoint: string,
  method: string,
  handler: (request: Request) => Promise<Response>
) {
  return async (request: Request): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    
    FileLogger.log({
      timestamp: new Date().toISOString(),
      endpoint: url.pathname,
      method,
      requestBody: { query: url.searchParams.toString() },
    });

    try {
      const response = await handler(request);
      const duration = Date.now() - startTime;
      
      const clonedResponse = response.clone();
      const body = await clonedResponse.json().catch(() => 'Could not parse body');
      
      FileLogger.log({
        timestamp: new Date().toISOString(),
        endpoint: url.pathname,
        method,
        status: response.status,
        responseBody: typeof body === 'string' ? body : JSON.stringify(body)?.slice(0, 2000),
        duration,
      });
      
      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      FileLogger.log({
        timestamp: new Date().toISOString(),
        endpoint: url.pathname,
        method,
        error: String(error),
        duration,
      });
      
      throw error;
    }
  };
}

export { FileLogger };
