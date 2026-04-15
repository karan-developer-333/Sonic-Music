import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const LOG_DIR = './logs';
const LOG_FILE = path.join(LOG_DIR, 'api-debug.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  duration?: number;
  requestParams?: Record<string, any>;
  responsePreview?: string;
  error?: string;
}

function writeLog(entry: LogEntry): void {
  ensureLogDir();
  
  const logLine = `[${entry.timestamp}] ${entry.method} ${entry.url}`;
  const details: string[] = [];
  
  if (entry.statusCode !== undefined) {
    details.push(`Status: ${entry.statusCode}`);
  }
  if (entry.duration !== undefined) {
    details.push(`Duration: ${entry.duration}ms`);
  }
  if (entry.requestParams) {
    details.push(`Params: ${JSON.stringify(entry.requestParams)}`);
  }
  if (entry.responsePreview) {
    details.push(`Response: ${entry.responsePreview.slice(0, 500)}`);
  }
  if (entry.error) {
    details.push(`Error: ${entry.error}`);
  }
  
  const fullLog = logLine + (details.length ? '\n  ' + details.join('\n  ') : '') + '\n';
  
  fs.appendFileSync(LOG_FILE, fullLog);
}

function truncateResponse(obj: any, maxLength = 1000): string {
  try {
    const str = JSON.stringify(obj);
    if (str.length > maxLength) {
      return str.slice(0, maxLength) + '... (truncated)';
    }
    return str;
  } catch {
    return String(obj).slice(0, maxLength);
  }
}

export function logApiRequest(
  method: string,
  url: string,
  params?: Record<string, any>
): () => void {
  const startTime = Date.now();
  
  writeLog({
    timestamp: new Date().toISOString(),
    method,
    url,
    requestParams: params,
  });
  
  return () => {
    const duration = Date.now() - startTime;
    writeLog({
      timestamp: new Date().toISOString(),
      method,
      url,
      duration,
    });
  };
}

export function logApiResponse(
  method: string,
  url: string,
  statusCode: number,
  response: any,
  duration: number,
  error?: Error
): void {
  writeLog({
    timestamp: new Date().toISOString(),
    method,
    url,
    statusCode,
    duration,
    responsePreview: truncateResponse(response),
    error: error?.message,
  });
}

export function createApiLogger() {
  return {
    info: (message: string, data?: any) => {
      writeLog({
        timestamp: new Date().toISOString(),
        method: 'INFO',
        url: message,
        requestParams: data,
      });
    },
    error: (message: string, error?: any) => {
      writeLog({
        timestamp: new Date().toISOString(),
        method: 'ERROR',
        url: message,
        error: String(error),
      });
    },
    warn: (message: string, data?: any) => {
      writeLog({
        timestamp: new Date().toISOString(),
        method: 'WARN',
        url: message,
        requestParams: data,
      });
    },
  };
}

export class ResponseLogger {
  private startTime: number;
  private method: string;
  private url: string;
  private params?: Record<string, any>;

  constructor(method: string, url: string, params?: Record<string, any>) {
    this.method = method;
    this.url = url;
    this.params = params;
    this.startTime = Date.now();
  }

  logResponse(response: NextResponse | Response): void {
    const duration = Date.now() - this.startTime;
    
    let responseData: any = {};
    if (response instanceof NextResponse) {
      responseData = response as NextResponse;
    }
    
    logApiResponse(
      this.method,
      this.url,
      responseData.status || 200,
      responseData,
      duration
    );
  }

  logError(error: Error): void {
    const duration = Date.now() - this.startTime;
    writeLog({
      timestamp: new Date().toISOString(),
      method: this.method,
      url: this.url,
      duration,
      error: error.message,
    });
  }
}

export function withApiLogging(
  handler: (request: NextRequest) => Promise<NextResponse>,
  endpoint: string
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const url = new URL(request.url);
    const method = request.method;
    const fullUrl = url.pathname + url.search;
    const params = Object.fromEntries(url.searchParams);
    
    const logger = new ResponseLogger(method, fullUrl, params);
    
    try {
      const response = await handler(request);
      logger.logResponse(response);
      return response;
    } catch (error) {
      logger.logError(error as Error);
      throw error;
    }
  };
}

export function readLogs(lines = 100): string[] {
  ensureLogDir();
  
  if (!fs.existsSync(LOG_FILE)) {
    return [];
  }
  
  const content = fs.readFileSync(LOG_FILE, 'utf-8');
  const allLines = content.split('\n').filter(Boolean);
  
  return allLines.slice(-lines);
}

export function clearLogs(): void {
  ensureLogDir();
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, '');
  }
}
