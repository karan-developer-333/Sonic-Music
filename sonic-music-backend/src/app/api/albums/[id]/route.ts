export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getAlbumBySeokey } from '@/services/gaana.service';
import { logger } from '@/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cacheKey = `album:${id}`;

    const cached = await cache.get<any>(cacheKey);

    if (cached) {
      logger.info('Returning cached album', { id });
      return NextResponse.json({
        album: cached,
        cached: true,
      });
    }

    logger.info('Fetching album', { id });

    const seokey = id.replace('gn_album_', '');
    const result = await getAlbumBySeokey(seokey);

    if (result.error || !result.data) {
      logger.error('GaanaPy album fetch failed', { error: result.error, id });
      return NextResponse.json(
        { error: result.error || 'Album not found' },
        { status: 404 }
      );
    }

    const album = result.data;

    await cache.set(cacheKey, album, 30 * 60);

    logger.info('Album fetched', { id, title: album.title });

    return NextResponse.json({
      album,
      cached: false,
    });
  } catch (error) {
    logger.error('Album error', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to fetch album' },
      { status: 500 }
    );
  }
}
