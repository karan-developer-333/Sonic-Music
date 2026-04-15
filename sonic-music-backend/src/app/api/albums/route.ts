export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { searchNepotuneAlbums } from '@/services/nepotune.service';
import { logger } from '@/utils/logger';
import type { NormalizedAlbum } from '@/types/music';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const language = searchParams.get('language') || 'hindi';

    const cacheKey = `nepotune:albums:p${page}:l${limit}:${language}`;

    const cached = await cache.get<{
      items: NormalizedAlbum[];
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    }>(cacheKey);

    if (cached) {
      logger.info('Albums cache hit', { duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Fetching albums', { page, language });

    const result = await searchNepotuneAlbums(`${language} album`, page, limit);

    const startIndex = 0;
    const endIndex = limit;
    const paginatedAlbums = result.albums.slice(startIndex, endIndex);
    const total = result.total;
    const hasMore = endIndex < total;

    const response = {
      items: paginatedAlbums,
      page,
      limit,
      total,
      hasMore,
    };

    await cache.set(cacheKey, response, 10 * 60);

    logger.info('Albums fetched', { count: paginatedAlbums.length, duration: Date.now() - startTime });

    return NextResponse.json({ ...response, cached: false });
  } catch (error) {
    logger.error('Albums error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to fetch albums' }, { status: 500 });
  }
}
