export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cache } from '@/cache/redis.cache';
import { searchNepotuneAll, searchNepotuneSongs, searchNepotuneAlbums, searchNepotuneArtists, searchNepotunePlaylists } from '@/services/nepotune.service';
import { deduplicateSongs, rankResults } from '@/aggregator/music.aggregator';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler, validationError } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { NormalizedSong, NormalizedAlbum, NormalizedArtist, NormalizedPlaylist } from '@/types/music';

const searchSchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(50).default(20),
  page: z.coerce.number().min(1).default(1),
  type: z.enum(['all', 'songs', 'albums', 'artists', 'playlists']).default('all'),
});

function generateCacheKey(query: string, type: string, page: number, limit: number): string {
  const hash = query.toLowerCase().trim().replace(/\s+/g, '_');
  return `nepotune:search:${type}:${hash}:p${page}:l${limit}`;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) {
      logger.warn('Search rate limited');
      return rateLimitResult;
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      logger.warn('Search query missing');
      return validationError('Query parameter "q" is required');
    }

    const validated = searchSchema.parse({ q: query, type, page, limit });
    const cacheKey = generateCacheKey(validated.q, validated.type, validated.page, validated.limit);

    const cached = await cache.get<{
      songs: NormalizedSong[];
      albums: NormalizedAlbum[];
      artists: NormalizedArtist[];
      playlists: NormalizedPlaylist[];
      query: string;
      page: number;
      total: number;
      hasMore: boolean;
    }>(cacheKey);

    if (cached) {
      logger.info('Search cache hit', { query: validated.q, type: validated.type, duration: Date.now() - startTime });
      return NextResponse.json({ ...cached, cached: true });
    }

    logger.info('Searching NepoTune', { query: validated.q, type: validated.type });

    let songs: NormalizedSong[] = [];
    let albums: NormalizedAlbum[] = [];
    let artists: NormalizedArtist[] = [];
    let playlists: NormalizedPlaylist[] = [];
    let total = 0;

    if (validated.type === 'all') {
      const result = await searchNepotuneAll(validated.q, validated.page, validated.limit);
      songs = result.songs;
      albums = result.albums;
      artists = result.artists;
      playlists = result.playlists;
      total = result.total;
    } else if (validated.type === 'songs') {
      const result = await searchNepotuneSongs(validated.q, validated.page, validated.limit);
      songs = result.songs;
      total = result.total;
    } else if (validated.type === 'albums') {
      const result = await searchNepotuneAlbums(validated.q, validated.page, validated.limit);
      albums = result.albums;
      total = result.total;
    } else if (validated.type === 'artists') {
      const result = await searchNepotuneArtists(validated.q, validated.page, validated.limit);
      artists = result.artists;
      total = result.total;
    } else if (validated.type === 'playlists') {
      const result = await searchNepotunePlaylists(validated.q, validated.page, validated.limit);
      playlists = result.playlists;
      total = result.total;
    }

    // Filter and rank songs
    const validSongs = songs.filter(s => s.streamUrl);
    const rankedSongs = rankResults(validSongs, validated.q);

    // Calculate pagination
    const startIndex = (validated.page - 1) * validated.limit;
    const endIndex = startIndex + validated.limit;
    const paginatedSongs = rankedSongs.slice(startIndex, endIndex);
    const hasMore = endIndex < total;

    const response = {
      songs: paginatedSongs,
      albums: albums.slice(0, 20),
      artists: artists.slice(0, 10),
      playlists: playlists.slice(0, 10),
      query: validated.q,
      page: validated.page,
      total,
      hasMore,
    };

    await cache.set(cacheKey, response, 5 * 60);

    logger.info('Search completed', {
      query: validated.q,
      songsCount: paginatedSongs.length,
      albumsCount: albums.length,
      artistsCount: artists.length,
      playlistsCount: playlists.length,
      duration: Date.now() - startTime
    });

    return NextResponse.json({ ...response, cached: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return validationError(error.errors[0].message);
    }
    return errorHandler(error);
  }
}
