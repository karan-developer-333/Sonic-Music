import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSpotifyStreamUrl } from '@/services/spotify.service';
import { getJamendoStreamUrl } from '@/services/jamendo.service';
import { getMockStreamUrl } from '@/services/mock.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler, validationError, notFoundError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { StreamResponse } from '@/types/music';

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

    logger.info('Getting stream URL', { id: validated.id, source });

    let result: StreamResponse | null = null;

    if (source === 'spotify') {
      const stream = await getSpotifyStreamUrl(validated.id);
      if (stream.data) result = { streamUrl: stream.data, source: 'spotify' };
    } else {
      const stream = await getJamendoStreamUrl(validated.id);
      if (stream.data) result = { streamUrl: stream.data, source: 'jamendo' };
    }

    if (!result) {
      logger.warn('External APIs failed, trying mock stream', { id: validated.id });
      const mockStream = getMockStreamUrl(validated.id);
      if (mockStream) {
        result = { streamUrl: mockStream, source };
      }
    }

    if (!result) {
      return notFoundError('Stream');
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error.errors[0].message);
    }
    return errorHandler(error);
  }
}