export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { getTrendingNepotune, searchNepotuneAlbums } from '@/services/nepotune.service';
import { deduplicateSongs } from '@/aggregator/music.aggregator';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { NormalizedSong, NormalizedAlbum } from '@/types/music';

const trendingSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  language: z.string().optional(),
  type: z.enum(['trending', 'newreleases', 'all']).default('all'),
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      language: searchParams.get('language') || undefined,
      type: searchParams.get('type') || 'all',
    };

    const validated = trendingSchema.parse(params);
    const cacheKey = `nepotune:trending:${validated.type}:${validated.language || 'hindi'}:p${validated.page}:l${validated.limit}`;

    const cached = await cache.get<{
      songs: NormalizedSong[];
      albums: NormalizedAlbum[];
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    }>(cacheKey);

    if (cached) {
      logger.info('Trending cache hit', { type: validated.type, duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Fetching trending', { type: validated.type, language: validated.language });

    const language = validated.language || 'hindi';

    const [trendingResult, albumsResult] = await Promise.allSettled([
      getTrendingNepotune(language, validated.limit * 3),
      validated.page === 1 ? searchNepotuneAlbums(`popular ${language} album`, 1, 10) : Promise.resolve({ albums: [], total: 0 }),
    ]);

    let songs: NormalizedSong[] = [];
    let albums: NormalizedAlbum[] = [];

    if (trendingResult.status === 'fulfilled') {
      songs = trendingResult.value;
    }

    if (albumsResult.status === 'fulfilled') {
      albums = albumsResult.value.albums;
    }

    const uniqueSongs = deduplicateSongs(songs);

    const startIndex = (validated.page - 1) * validated.limit;
    const endIndex = startIndex + validated.limit;
    const paginatedSongs = uniqueSongs.slice(startIndex, endIndex);
    const total = uniqueSongs.length;
    const hasMore = endIndex < total;

    const response = {
      songs: paginatedSongs,
      albums,
      page: validated.page,
      limit: validated.limit,
      total,
      hasMore,
    };

    await cache.set(cacheKey, response, 15 * 60);

    logger.info('Trending fetched', {
      songsCount: paginatedSongs.length,
      albumsCount: albums.length,
      duration: Date.now() - startTime
    });

    return NextResponse.json({ ...response, cached: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return errorHandler(error);
  }
}
