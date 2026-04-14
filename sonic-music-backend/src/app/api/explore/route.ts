export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { getTrendingGaana, getNewReleasesGaana } from '@/services/gaana.service';
import { logger } from '@/utils/logger';
import type { NormalizedSong } from '@/types/music';

const exploreSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: z.enum(['trending', 'newreleases', 'all']).default('all'),
  language: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      type: searchParams.get('type') || 'all',
      language: searchParams.get('language') || undefined,
    };

    const validated = exploreSchema.parse(params);
    const cacheKey = `explore:${validated.type}:${validated.language || 'all'}:${validated.page}:${validated.limit}`;

    const cached = await cache.get<{
      items: NormalizedSong[];
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    }>(cacheKey);

    if (cached) {
      logger.info('Returning cached explore data', { type: validated.type, page: validated.page });
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    logger.info('Fetching explore data', { type: validated.type, page: validated.page });

    const language = validated.language || 'Hindi';
    let songs: NormalizedSong[] = [];
    let hasMore = false;

    if (validated.type === 'trending' || validated.type === 'all') {
      const trendingResult = await getTrendingGaana(language, validated.limit * 2);
      if (trendingResult.data) {
        songs = [...songs, ...trendingResult.data];
      }
    }

    if (validated.type === 'newreleases' || validated.type === 'all') {
      const newReleasesResult = await getNewReleasesGaana(language, validated.limit * 2);
      if (newReleasesResult.data) {
        const existingIds = new Set(songs.map(s => s.id));
        const uniqueNew = newReleasesResult.data.filter(s => !existingIds.has(s.id));
        songs = [...songs, ...uniqueNew];
      }
    }

    const uniqueSongs = songs.filter((song, index, self) => 
      index === self.findIndex(s => s.id === song.id)
    );

    const startIndex = (validated.page - 1) * validated.limit;
    const endIndex = startIndex + validated.limit;
    const paginatedSongs = uniqueSongs.slice(startIndex, endIndex);
    const total = uniqueSongs.length;
    hasMore = endIndex < total;

    const response = {
      items: paginatedSongs,
      page: validated.page,
      limit: validated.limit,
      total,
      hasMore,
    };

    await cache.set(cacheKey, response, 5 * 60);

    logger.info('Explore data fetched', { 
      type: validated.type, 
      page: validated.page, 
      count: paginatedSongs.length,
      hasMore 
    });

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
    
    logger.error('Explore error', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to fetch explore data' },
      { status: 500 }
    );
  }
}
