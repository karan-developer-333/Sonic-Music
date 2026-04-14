export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/utils/logger';

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
});

const addSongSchema = z.object({
  songId: z.string(),
  songTitle: z.string(),
  artist: z.string(),
  coverUrl: z.string().optional(),
  streamUrl: z.string().optional(),
  source: z.string().default('gaana'),
  duration: z.number().int().default(0),
});

function requireAuth(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) {
    return null;
  }
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includePublic = searchParams.get('includePublic') === 'true';

    const playlists = await prisma.playlist.findMany({
      where: {
        userId: user.userId,
        ...(includePublic ? {} : { isPublic: false }),
      },
      include: {
        songs: {
          orderBy: { addedAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { songs: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      playlists: playlists.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        coverUrl: p.coverUrl || p.songs[0]?.coverUrl,
        songCount: p._count.songs,
        isPublic: p.isPublic,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (error) {
    logger.error('Get playlists error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to get playlists' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createPlaylistSchema.parse(body);

    const playlist = await prisma.playlist.create({
      data: {
        name: validated.name,
        description: validated.description,
        coverUrl: validated.coverUrl,
        isPublic: validated.isPublic,
        userId: user.userId,
      },
    });

    logger.info('Playlist created', { playlistId: playlist.id, userId: user.userId });

    return NextResponse.json({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.coverUrl,
      songCount: 0,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error('Create playlist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to create playlist' }, { status: 500 });
  }
}
