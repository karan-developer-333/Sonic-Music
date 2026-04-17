export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/utils/logger';

const addFavoriteSchema = z.object({
  songId: z.string(),
  songTitle: z.string(),
  artist: z.string(),
  coverUrl: z.string().optional(),
  source: z.string().default('saavn'),
  duration: z.number().int().default(0),
});

function requireAuth(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const [favorites, totalCount] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId: user.userId },
        orderBy: { favoritedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.favorite.count({ where: { userId: user.userId } }),
    ]);

    return NextResponse.json({
      favorites:       favorites.map((f: { songId: string; songTitle: string; artist: string; coverUrl: string | null; source: string; duration: number; favoritedAt: Date }) => ({
        id: f.songId,
        title: f.songTitle,
        artist: f.artist,
        coverUrl: f.coverUrl,
        source: f.source,
        duration: f.duration,
        favoritedAt: f.favoritedAt,
      })),
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    logger.error('Get favorites error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to get favorites' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = addFavoriteSchema.parse(body);

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_songId: {
          userId: user.userId,
          songId: validated.songId,
        },
      },
      update: {
        songTitle: validated.songTitle,
        artist: validated.artist,
        coverUrl: validated.coverUrl,
        source: validated.source,
        duration: validated.duration,
        favoritedAt: new Date(),
      },
      create: {
        userId: user.userId,
        songId: validated.songId,
        songTitle: validated.songTitle,
        artist: validated.artist,
        coverUrl: validated.coverUrl,
        source: validated.source,
        duration: validated.duration,
      },
    });

    logger.info('Song added to favorites', { songId: validated.songId, userId: user.userId });

    return NextResponse.json({
      id: favorite.songId,
      title: favorite.songTitle,
      artist: favorite.artist,
      coverUrl: favorite.coverUrl,
      source: favorite.source,
      duration: favorite.duration,
      favoritedAt: favorite.favoritedAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error('Add favorite error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    await prisma.favorite.deleteMany({
      where: {
        userId: user.userId,
        songId,
      },
    });

    logger.info('Song removed from favorites', { songId, userId: user.userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Remove favorite error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}
