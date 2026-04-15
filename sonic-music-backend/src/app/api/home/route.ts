export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { searchNepotuneSongs, searchNepotuneAlbums, getTrendingNepotune } from '@/services/nepotune.service';
import { deduplicateSongs } from '@/aggregator/music.aggregator';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { NormalizedSong, NormalizedAlbum } from '@/types/music';

const CACHE_KEY = 'nepotune:home';
const CACHE_TTL = 10 * 60;

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const cached = await cache.get<{
      popularSongs: NormalizedSong[];
      trendingSongs: NormalizedSong[];
      newReleases: NormalizedSong[];
      topCharts: NormalizedSong[];
      romanticHindi: NormalizedSong[];
      popularAlbums: NormalizedAlbum[];
      cached: boolean;
      timestamp: number;
    }>(CACHE_KEY);

    if (cached) {
      logger.info('Home cache hit', { duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Fetching home data from NepoTune');

    const [trendingResult, albumsResult, popularResult, romanticResult] = await Promise.allSettled([
      getTrendingNepotune('hindi', 50),
      searchNepotuneAlbums('popular hindi album', 1, 10),
      searchNepotuneSongs('bollywood hits', 1, 20),
      searchNepotuneSongs('romantic hindi', 1, 20),
    ]);

    let trendingSongs: NormalizedSong[] = [];
    let popularSongs: NormalizedSong[] = [];
    let newReleases: NormalizedSong[] = [];
    let topCharts: NormalizedSong[] = [];
    let romanticHindi: NormalizedSong[] = [];
    let popularAlbums: NormalizedAlbum[] = [];

    if (trendingResult.status === 'fulfilled') {
      trendingSongs = trendingResult.value;
      popularSongs = trendingResult.value.slice(0, 20);
      newReleases = trendingResult.value.slice(10, 30);
      topCharts = trendingResult.value.slice(0, 20);
    }

    if (popularResult.status === 'fulfilled') {
      popularSongs = deduplicateSongs([...popularSongs, ...popularResult.value.songs]).slice(0, 20);
    }

    if (romanticResult.status === 'fulfilled') {
      romanticHindi = romanticResult.value.songs;
    }

    if (albumsResult.status === 'fulfilled') {
      popularAlbums = albumsResult.value.albums;
    }

    const response = {
      popularSongs,
      trendingSongs,
      newReleases,
      topCharts,
      romanticHindi,
      popularAlbums,
      cached: false,
      timestamp: Date.now(),
    };

    await cache.set(CACHE_KEY, response, CACHE_TTL);

    logger.info('Home data fetched', {
      popularSongs: popularSongs.length,
      trendingSongs: trendingSongs.length,
      popularAlbums: popularAlbums.length,
      duration: Date.now() - startTime
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Home error', { error: (error as Error).message });
    return errorHandler(error);
  }
}
