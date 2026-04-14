export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getTrendingGaana, getNewReleasesGaana } from '@/services/gaana.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { TrendingResponse } from '@/types/music';

const CACHE_KEY = 'trending:songs';
const CACHE_TTL = 15 * 60;

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const language = searchParams.get('language') || 'Hindi';
    const type = searchParams.get('type') || 'trending';

    const cacheKey = `${type}:${language}:${limit}`;

    const cached = await cache.get<TrendingResponse>(cacheKey);
    if (cached) {
      logger.info('Returning cached songs', { type, language });
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    logger.info(`Fetching ${type} from GaanaPy`, { language, limit });

    let songs;

    if (type === 'newreleases') {
      const result = await getNewReleasesGaana(language, limit);
      if (result.error || !result.data) {
        logger.error('GaanaPy new releases failed', { error: result.error });
        return errorHandler(new Error(result.error || 'Failed to fetch new releases'));
      }
      songs = result.data;
    } else {
      const result = await getTrendingGaana(language, limit);
      if (result.error || !result.data) {
        logger.error('GaanaPy trending failed', { error: result.error });
        return errorHandler(new Error(result.error || 'Failed to fetch trending'));
      }
      songs = result.data;
    }

    const response: TrendingResponse = {
      songs,
      cached: false,
      timestamp: Date.now(),
    };

    await cache.set(cacheKey, response, CACHE_TTL);

    logger.info('Songs fetched from GaanaPy', { type, language, count: songs.length });

    return NextResponse.json(response);
  } catch (error) {
    return errorHandler(error);
  }
}