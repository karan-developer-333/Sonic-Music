export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { searchNepotuneSongs, searchNepotuneAlbums } from '@/services/nepotune.service';
import { deduplicateSongs } from '@/aggregator/music.aggregator';
import { logger } from '@/utils/logger';
import type { NormalizedSong, NormalizedAlbum } from '@/types/music';

const exploreSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: z.enum(['songs', 'albums', 'trending', 'newreleases', 'all']).default('all'),
  language: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      type: searchParams.get('type') || 'all',
      language: searchParams.get('language') || undefined,
    };

    const validated = exploreSchema.parse(params);
    const cacheKey = `nepotune:explore:${validated.type}:${validated.language || 'all'}:p${validated.page}:l${validated.limit}`;

    const cached = await cache.get<{
      items: (NormalizedSong | NormalizedAlbum)[];
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
      type: string;
    }>(cacheKey);

    if (cached) {
      logger.info('Explore cache hit', { type: validated.type, duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Fetching explore data', { type: validated.type, language: validated.language });

    const language = validated.language || 'hindi';
    let items: (NormalizedSong | NormalizedAlbum)[] = [];
    let total = 0;

    if (validated.type === 'albums') {
      const result = await searchNepotuneAlbums(`${language} album`, validated.page, validated.limit);
      items = result.albums;
      total = result.total;
    } else {
      const query = `${language} songs`;
      const result = await searchNepotuneSongs(query, validated.page, validated.limit);
      
      items = result.songs;
      total = result.total;
    }

    const hasMore = validated.page * validated.limit < total;

    const response = {
      items,
      page: validated.page,
      limit: validated.limit,
      total,
      hasMore,
      type: validated.type,
    };

    await cache.set(cacheKey, response, 5 * 60);

    logger.info('Explore fetched', {
      type: validated.type,
      count: items.length,
      hasMore,
      duration: Date.now() - startTime
    });

    return NextResponse.json({ ...response, cached: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error('Explore error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to fetch explore data' }, { status: 500 });
  }
}
