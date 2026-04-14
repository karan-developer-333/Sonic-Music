import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { getSpotifyTrending, getSpotifyTrendingWithOAuth, shouldUseOAuth } from '@/services/spotify.service';
import { getJamendoTrending } from '@/services/jamendo.service';
import { getMockTrending } from '@/services/mock.service';
import { aggregateResults } from '@/aggregator/music.aggregator';
import { sessionManager } from '@/services/session.service';
import { rateLimit } from '@/middleware/ratelimit.middleware';
import { errorHandler } from '@/middleware/error.middleware';
import { logger } from '@/utils/logger';
import type { TrendingResponse, NormalizedSong } from '@/types/music';

const CACHE_KEY = 'trending:songs';
const CACHE_TTL = 15 * 60;

export async function GET(request: NextRequest) {
  try {
    const rateLimitResult = rateLimit(request);
    if (rateLimitResult) return rateLimitResult;

    const useOAuth = shouldUseOAuth();
    let userAccessToken: string | null = null;

    if (useOAuth) {
      const session = await sessionManager.getCurrentSession();
      if (session && !sessionManager.isTokenExpired(session.tokens)) {
        userAccessToken = session.tokens.accessToken;
        logger.info('Using OAuth user token for trending');
      } else {
        logger.info('No valid OAuth session, falling back to client credentials');
      }
    }

    const cached = await cache.get<TrendingResponse>(CACHE_KEY);
    if (cached && !userAccessToken) {
      logger.info('Returning cached trending songs');
      return NextResponse.json({
        ...cached,
        cached: true,
      });
    }

    logger.info('Fetching trending from all services');
    
    let spotifyPromise;
    if (userAccessToken) {
      spotifyPromise = getSpotifyTrendingWithOAuth(userAccessToken);
    } else {
      spotifyPromise = getSpotifyTrending();
    }

    const [spotify, jamendo] = await Promise.allSettled([
      spotifyPromise,
      getJamendoTrending(),
    ]);

    const results: NormalizedSong[] = [];

    if (spotify.status === 'fulfilled' && spotify.value.data) {
      results.push(...spotify.value.data);
    }
    if (jamendo.status === 'fulfilled' && jamendo.value.data) {
      results.push(...jamendo.value.data);
    }

    if (results.length === 0) {
      logger.warn('All external APIs failed, using mock data');
      const mockSongs = getMockTrending();
      const response: TrendingResponse = {
        songs: mockSongs,
        cached: false,
        timestamp: Date.now(),
      };
      if (!userAccessToken) {
        await cache.set(CACHE_KEY, response, CACHE_TTL);
      }
      return NextResponse.json(response);
    }

    const songs = aggregateResults(results).slice(0, 20);

    const response: TrendingResponse = {
      songs,
      cached: false,
      timestamp: Date.now(),
      authenticated: !!userAccessToken,
    };

    if (!userAccessToken) {
      await cache.set(CACHE_KEY, response, CACHE_TTL);
    }

    logger.info('Trending songs fetched', { count: songs.length, authenticated: !!userAccessToken });

    return NextResponse.json(response);
  } catch (error) {
    return errorHandler(error);
  }
}