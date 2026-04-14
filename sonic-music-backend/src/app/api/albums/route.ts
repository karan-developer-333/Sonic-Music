export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { getAlbumsGaana } from '@/services/gaana.service';
import { logger } from '@/utils/logger';

const albumsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const validated = albumsSchema.parse(params);
    const cacheKey = `albums:page:${validated.page}:limit:${validated.limit}`;

    const cached = await cache.get<{
      items: any[];
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    }>(cacheKey);

    if (cached) {
      logger.info('Returning cached albums', { page: validated.page });
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    logger.info('Fetching albums', { page: validated.page });

    const result = await getAlbumsGaana(validated.page, validated.limit * 2);

    if (result.error || !result.data) {
      logger.error('GaanaPy albums failed', { error: result.error });
      return NextResponse.json(
        { error: 'Failed to fetch albums' },
        { status: 500 }
      );
    }

    const albums = result.data;
    const startIndex = 0;
    const endIndex = validated.limit;
    const paginatedAlbums = albums.slice(startIndex, endIndex);
    const total = albums.length;
    const hasMore = endIndex < total;

    const response = {
      items: paginatedAlbums,
      page: validated.page,
      limit: validated.limit,
      total,
      hasMore,
    };

    await cache.set(cacheKey, response, 10 * 60);

    logger.info('Albums fetched', { count: paginatedAlbums.length, page: validated.page });

    return NextResponse.json({
      ...response,
      cached: false,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    logger.error('Albums error', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to fetch albums' },
      { status: 500 }
    );
  }
}
