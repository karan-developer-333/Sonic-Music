import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { searchSpotify } from '@/services/spotify.service';
import { searchJamendo } from '@/services/jamendo.service';
import { aggregateResults } from '@/aggregator/music.aggregator';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { NormalizedSong } from '@/types/music';

const CACHE_TTL = 30 * 60; // 30 minutes

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const genres = searchParams.get('genres')?.split(',') || ['bollywood', 'indian', 'hindustani'];
    const limit = parseInt(searchParams.get('limit') || '10');

    const cacheKey = `recommendations:${genres.join(',')}:${limit}`;

    const cached = await cache.get<NormalizedSong[]>(cacheKey);
    if (cached) {
      logger.info('Returning cached recommendations');
      return NextResponse.json({
        songs: cached,
        cached: true,
        timestamp: Date.now(),
      });
    }

    logger.info('Fetching recommendations for genres:', genres);

    // Search for songs in each genre
    const searchPromises = genres.flatMap(genre => [
      searchSpotify(genre),
      searchJamendo(genre),
    ]);

    const searchResults = await Promise.allSettled(searchPromises);

    const results: NormalizedSong[] = [];

    searchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.data) {
        results.push(...result.value.data);
      }
    });

    if (results.length === 0) {
      logger.warn('No recommendations found');
      return NextResponse.json({
        songs: [],
        cached: false,
        timestamp: Date.now(),
      });
    }

    const recommendations = aggregateResults(results).slice(0, limit);

    await cache.set(cacheKey, recommendations, CACHE_TTL);

    logger.info('Recommendations fetched and cached', { count: recommendations.length });

    return NextResponse.json({
      songs: recommendations,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    return errorHandler(error);
  }
}