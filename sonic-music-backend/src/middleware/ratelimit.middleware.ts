import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../utils/logger';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits = new Map<string, RateLimitEntry>();
  private windowMs = 60 * 1000;
  private maxRequests = 100;

  check(ip: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(ip);

    if (!entry || now > entry.resetTime) {
      this.limits.set(ip, { count: 1, resetTime: now + this.windowMs });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { ip });
      return false;
    }

    entry.count++;
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(ip);
      }
    }
  }
}

const rateLimiter = new RateLimiter();

setInterval(() => rateLimiter.cleanup(), 60 * 1000);

export function rateLimit(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';

  if (!rateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }

  return null;
}