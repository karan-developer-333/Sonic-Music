export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/cache/redis.cache';
import { logger } from '@/utils/logger';

interface Category {
  id: string;
  name: string;
  imageUrl: string;
  type: 'language' | 'genre' | 'mood';
}

const CATEGORIES: Category[] = [
  { id: 'hindi', name: 'Hindi', imageUrl: '', type: 'language' },
  { id: 'punjabi', name: 'Punjabi', imageUrl: '', type: 'language' },
  { id: 'tamil', name: 'Tamil', imageUrl: '', type: 'language' },
  { id: 'telugu', name: 'Telugu', imageUrl: '', type: 'language' },
  { id: 'bengali', name: 'Bengali', imageUrl: '', type: 'language' },
  { id: 'marathi', name: 'Marathi', imageUrl: '', type: 'language' },
  { id: 'malayalam', name: 'Malayalam', imageUrl: '', type: 'language' },
  { id: 'kannada', name: 'Kannada', imageUrl: '', type: 'language' },
  { id: 'bollywood', name: 'Bollywood', imageUrl: '', type: 'genre' },
  { id: 'pop', name: 'Pop', imageUrl: '', type: 'genre' },
  { id: 'rock', name: 'Rock', imageUrl: '', type: 'genre' },
  { id: 'hiphop', name: 'Hip Hop', imageUrl: '', type: 'genre' },
  { id: 'romantic', name: 'Romantic', imageUrl: '', type: 'mood' },
  { id: 'party', name: 'Party', imageUrl: '', type: 'mood' },
  { id: 'workout', name: 'Workout', imageUrl: '', type: 'mood' },
  { id: 'devotional', name: 'Devotional', imageUrl: '', type: 'genre' },
  { id: 'ghazal', name: 'Ghazal', imageUrl: '', type: 'genre' },
  { id: 'classical', name: 'Classical', imageUrl: '', type: 'genre' },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const cacheKey = `categories:${type || 'all'}`;

    const cached = await cache.get<Category[]>(cacheKey);
    if (cached) {
      logger.info('Returning cached categories', { type });
      return NextResponse.json({
        categories: cached,
        cached: true,
      });
    }

    const filteredCategories = type
      ? CATEGORIES.filter(c => c.type === type)
      : CATEGORIES;

    await cache.set(cacheKey, filteredCategories, 60 * 60);

    logger.info('Categories fetched', { count: filteredCategories.length, type });

    return NextResponse.json({
      categories: filteredCategories,
      cached: false,
    });
  } catch (error) {
    logger.error('Categories error', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
