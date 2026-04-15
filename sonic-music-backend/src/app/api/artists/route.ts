export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { searchNepotuneArtists } from '@/services/nepotune.service';
import { logger } from '@/utils/logger';
import type { NormalizedArtist } from '@/types/music';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const cacheKey = `nepotune:artists:search:${query}:p${page}:l${limit}`;

    const cached = await cache.get<{
      artists: NormalizedArtist[];
      page: number;
      total: number;
      hasMore: boolean;
    }>(cacheKey);

    if (cached) {
      logger.info('Artists search cache hit', { query, duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Searching artists', { query });

    const result = await searchNepotuneArtists(query, page, limit);

    const response = {
      artists: result.artists,
      page,
      total: result.total,
      hasMore: page * limit < result.total,
    };

    await cache.set(cacheKey, response, 10 * 60);

    logger.info('Artists search completed', {
      query,
      count: result.artists.length,
      duration: Date.now() - startTime
    });

    return NextResponse.json({ ...response, cached: false });
  } catch (error) {
    logger.error('Artists search error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to search artists' }, { status: 500 });
  }
}
