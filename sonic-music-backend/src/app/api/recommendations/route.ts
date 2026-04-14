import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getTrendingGaana } from '@/services/gaana.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';

const CACHE_KEY = 'recommendations:songs';
const CACHE_TTL = 30 * 60;

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const language = searchParams.get('language') || 'Hindi';

    const cacheKey = `recommendations:${language}:${limit}`;

    const cached = await cache.get<any>(cacheKey);
    if (cached) {
      logger.info('Returning cached recommendations');
      return NextResponse.json({
        songs: cached,
        cached: true,
        timestamp: Date.now(),
      });
    }

    logger.info('Fetching recommendations from GaanaPy trending', { language, limit });

    const result = await getTrendingGaana(language, limit);

    if (result.error || !result.data) {
      logger.error('GaanaPy recommendations failed', { error: result.error });
      return errorHandler(new Error(result.error || 'Failed to fetch recommendations'));
    }

    const recommendations = result.data;

    await cache.set(cacheKey, recommendations, CACHE_TTL);

    logger.info('Recommendations fetched from GaanaPy', { count: recommendations.length });

    return NextResponse.json({
      songs: recommendations,
      cached: false,
      timestamp: Date.now(),
    });
  } catch (error) {
    return errorHandler(error);
  }
}