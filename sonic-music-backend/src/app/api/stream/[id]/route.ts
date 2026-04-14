export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSongBySeokey } from '@/services/gaana.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler, validationError, notFoundError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { StreamResponse } from '@/types/music';

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

    logger.info('Getting stream URL from GaanaPy', { id: validated.id, seokey });

    const result = await getSongBySeokey(seokey);

    if (result.error || !result.data) {
      return notFoundError('Stream');
    }

    if (!result.data.streamUrl) {
      return notFoundError('Stream URL not available');
    }

    const response: StreamResponse = {
      streamUrl: result.data.streamUrl,
      source: 'gaana',
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error.errors[0].message);
    }
    return errorHandler(error);
  }
}