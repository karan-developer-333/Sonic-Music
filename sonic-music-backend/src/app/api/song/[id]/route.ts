export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { getSongBySeokey, searchGaana } from '@/services/gaana.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler, validationError, notFoundError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { SongResponse } from '@/types/music';

const idSchema = z.object({
  id: z.string().regex(/^gn_[\w-]+$/, 'Invalid song ID format'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;

    const validated = idSchema.parse({ id });
    const seokey = validated.id.replace('gn_', '');
    const cacheKey = `song:${validated.id}`;

    const cached = await cache.get<SongResponse>(cacheKey);
    if (cached) {
      logger.info('Returning cached song', { id: validated.id });
      return NextResponse.json(cached);
    }

    logger.info('Fetching song from GaanaPy', { id: validated.id, seokey });

    const result = await getSongBySeokey(seokey);

    if (result.error || !result.data) {
      logger.warn('Song not found in GaanaPy, trying search fallback', { seokey });
      
      const searchResult = await searchGaana(seokey, 1);
      if (searchResult.data && searchResult.data.length > 0) {
        const song = searchResult.data[0];
        const response: SongResponse = { song };
        await cache.set(cacheKey, response, 30 * 60);
        return NextResponse.json(response);
      }
      
      return notFoundError('Song');
    }

    const response: SongResponse = { song: result.data };
    await cache.set(cacheKey, response, 30 * 60);

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error.errors[0].message);
    }
    return errorHandler(error);
  }
}