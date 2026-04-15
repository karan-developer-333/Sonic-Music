export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getNepotuneArtist } from '@/services/nepotune.service';
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
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
    }

    const cacheKey = `nepotune:artist:${id}`;

    const cached = await cache.get<{
      artist: any;
      topSongs: any[];
      albums: any[];
    }>(cacheKey);

    if (cached) {
      logger.info('Artist cache hit', { id, duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Fetching artist', { id });

    const result = await getNepotuneArtist(id);

    if (!result) {
      logger.warn('Artist not found', { id });
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    const response = {
      artist: result.artist,
      topSongs: result.topSongs,
      albums: result.albums,
    };

    await cache.set(cacheKey, response, 30 * 60);

    logger.info('Artist fetched', {
      id,
      topSongs: result.topSongs.length,
      albums: result.albums.length,
      duration: Date.now() - startTime
    });

    return NextResponse.json({ ...response, cached: false });
  } catch (error) {
    logger.error('Artist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to fetch artist' }, { status: 500 });
  }
}
