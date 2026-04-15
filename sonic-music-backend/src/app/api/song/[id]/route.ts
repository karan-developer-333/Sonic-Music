export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getNepotuneSong } from '@/services/nepotune.service';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { SongResponse } from '@/types/music';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Song ID is required' }, { status: 400 });
    }

    const cacheKey = `nepotune:song:${id}`;

    const cached = await cache.get<SongResponse>(cacheKey);
    if (cached) {
      logger.info('Song cache hit', { id, duration: Date.now() - startTime });
      return NextResponse.json(cached);
    }

    logger.info('Fetching song', { id });

    const song = await getNepotuneSong(id);

    if (!song) {
      logger.warn('Song not found', { id });
      return NextResponse.json({ error: 'Song not found' }, { status: 404 });
    }

    const response: SongResponse = { song };
    
    await cache.set(cacheKey, response, 30 * 60);

    logger.info('Song fetched', { id, duration: Date.now() - startTime });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Song error', { error: (error as Error).message });
    return errorHandler(error);
  }
}
