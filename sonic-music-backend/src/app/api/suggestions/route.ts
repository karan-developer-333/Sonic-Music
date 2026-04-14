export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { logger } from '@/utils/logger';

const POPULAR_SEARCHES = [
  'Bollywood Hits',
  'Arijit Singh',
  'Armaan Malik',
  'Jubin Nautiyal',
  'Neha Kakkar',
  'Diljit Dosanjh',
  'Badshah',
  'Shreya Ghoshal',
  'Romantic Songs',
  'Party Songs',
  'Workout Music',
  'Devotional Songs',
  'Sad Songs',
  'Punjabi Songs',
  'Tamil Hits',
  'Telugu Melodies',
];

const GENRE_SUGGESTIONS = [
  'Bollywood',
  'Punjabi',
  'Tamil',
  'Telugu',
  'Bengali',
  'Marathi',
  'Malayalam',
  'Kannada',
  'Pop',
  'Rock',
  'Hip Hop',
  'Electronic',
  'Classical',
  'Jazz',
  'R&B',
];

const MOOD_SUGGESTIONS = [
  'Happy',
  'Sad',
  'Romantic',
  'Energetic',
  'Calm',
  'Party',
  'Workout',
  'Focus',
  'Sleep',
  'Travel',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const cacheKey = `suggestions:${query.toLowerCase()}`;

    if (!query.trim()) {
      return NextResponse.json({
        suggestions: [],
      });
    }

    const cached = await cache.get<{ suggestions: string[] }>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const lowerQuery = query.toLowerCase();

    const popularMatches = POPULAR_SEARCHES.filter(s => 
      s.toLowerCase().includes(lowerQuery)
    ).slice(0, 3);

    const genreMatches = GENRE_SUGGESTIONS.filter(g => 
      g.toLowerCase().includes(lowerQuery)
    ).slice(0, 2);

    const moodMatches = MOOD_SUGGESTIONS.filter(m => 
      m.toLowerCase().includes(lowerQuery)
    ).slice(0, 2);

    const suggestions = [...new Set([...popularMatches, ...genreMatches, ...moodMatches])].slice(0, 5);

    const response = { suggestions };

    await cache.set(cacheKey, response, 10 * 60);

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Suggestions error', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to fetch suggestions' },
      { status: 500 }
    );
  }
}
