import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { searchGaana } from '@/services/gaana.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler, validationError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { SearchResponse } from '@/types/music';

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
});

function generateCacheKey(query: string): string {
  const hash = query.toLowerCase().trim().replace(/\s+/g, '_');
  return `search:${hash}`;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
      return validationError('Query parameter "q" is required');
    }

    const validated = searchSchema.parse({ q: query });
    const cacheKey = generateCacheKey(validated.q);

    const cached = await cache.get<SearchResponse>(cacheKey);
    if (cached) {
      logger.info('Returning cached search results', { query: validated.q });
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    logger.info('Searching GaanaPy', { query: validated.q });

    const result = await searchGaana(validated.q, validated.limit);

    if (result.error || !result.data) {
      logger.error('GaanaPy search failed', { error: result.error, query: validated.q });
      return errorHandler(new Error(result.error || 'Failed to search'));
    }

    const songs = result.data;

    const response: SearchResponse = {
      songs,
      query: validated.q,
      cached: false,
      total: songs.length,
    };

    await cache.set(cacheKey, response, 5 * 60);

    logger.info('Search completed', { query: validated.q, results: songs.length });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error.errors[0].message);
    }
    return errorHandler(error);
  }
}