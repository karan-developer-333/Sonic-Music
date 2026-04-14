import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { getSpotifySong } from '@/services/spotify.service';
import { getJamendoSong } from '@/services/jamendo.service';
import { getMockSong } from '@/services/mock.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler, validationError, notFoundError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { SongResponse } from '@/types/music';

const idSchema = z.object({
  id: z.string().regex(/^(sp|jm)_[\w-]+$/, 'Invalid song ID format'),
});

function getSourceFromId(id: string): 'spotify' | 'jamendo' {
  if (id.startsWith('sp_')) return 'spotify';
  return 'jamendo';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const { id } = await params;

    const validated = idSchema.parse({ id });
    const source = getSourceFromId(validated.id);
    const cacheKey = `song:${validated.id}`;

    const cached = await cache.get<SongResponse>(cacheKey);
    if (cached) {
      logger.info('Returning cached song', { id: validated.id });
      return NextResponse.json(cached);
    }

    logger.info('Fetching song', { id: validated.id, source });

    let result: SongResponse | null = null;

    if (source === 'spotify') {
      const song = await getSpotifySong(validated.id);
      if (song.data) result = { song: song.data };
    } else {
      const song = await getJamendoSong(validated.id);
      if (song.data) result = { song: song.data };
    }

    if (!result) {
      logger.warn('External APIs failed, trying mock', { id: validated.id });
      const mockSong = getMockSong(validated.id);
      if (mockSong) {
        result = { song: mockSong };
      }
    }

    if (!result) {
      return notFoundError('Song');
    }

    await cache.set(cacheKey, result, 30 * 60);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error.errors[0].message);
    }
    return errorHandler(error);
  }
}