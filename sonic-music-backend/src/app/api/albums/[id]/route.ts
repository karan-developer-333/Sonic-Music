export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getNepotuneAlbum } from '@/services/nepotune.service';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Album ID is required' }, { status: 400 });
    }

    const cacheKey = `nepotune:album:${id}`;

    const cached = await cache.get<{
      album: any;
      songs: any[];
      cached: boolean;
    }>(cacheKey);

    if (cached) {
      logger.info('Album cache hit', { id, duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Fetching album', { id });

    const result = await getNepotuneAlbum(id);

    if (!result) {
      logger.warn('Album not found', { id });
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    const response = {
      album: result.album,
      songs: result.songs,
      cached: false,
    };

    await cache.set(cacheKey, response, 15 * 60);

    logger.info('Album fetched', { id, songsCount: result.songs.length, duration: Date.now() - startTime });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Album error', { error: (error as Error).message });
    return errorHandler(error);
  }
}
