export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getNepotuneSong } from '@/services/nepotune.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { StreamResponse } from '@/types/music';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const cacheKey = `nepotune:stream:${id}`;

    const cached = await cache.get<StreamResponse>(cacheKey);
    if (cached) {
      logger.info('Stream cache hit', { id, duration: Date.now() - startTime });
      return NextResponse.json(cached);
    }

    logger.info('Fetching stream URL', { id });

    const song = await getNepotuneSong(id);

    if (!song || !song.streamUrl) {
      logger.warn('Stream URL not available', { id });
      return NextResponse.json({ error: 'Stream URL not available' }, { status: 404 });
    }

    const response: StreamResponse = {
      streamUrl: song.streamUrl,
      source: 'saavn',
    };
    
    await cache.set(cacheKey, response, 30 * 60);

    logger.info('Stream URL fetched', { id, duration: Date.now() - startTime });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Stream error', { error: (error as Error).message });
    return errorHandler(error);
  }
}
