export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/utils/logger';

const saveAlbumSchema = z.object({
  albumId: z.string(),
  title: z.string(),
  artist: z.string(),
  coverUrl: z.string().optional(),
  source: z.string().default('gaana'),
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

    const savedAlbums = await prisma.savedAlbum.findMany({
      where: { userId: user.userId },
      orderBy: { savedAt: 'desc' },
    });

    return NextResponse.json({
      albums: savedAlbums.map(a => ({
        id: a.albumId,
        title: a.title,
        artist: a.artist,
        coverUrl: a.coverUrl,
        source: a.source,
        savedAt: a.savedAt,
      })),
    });
  } catch (error) {
    logger.error('Get saved albums error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to get saved albums' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = saveAlbumSchema.parse(body);

    const existing = await prisma.savedAlbum.findUnique({
      where: {
        userId_albumId: {
          userId: user.userId,
          albumId: validated.albumId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Album already saved' }, { status: 409 });
    }

    const savedAlbum = await prisma.savedAlbum.create({
      data: {
        userId: user.userId,
        albumId: validated.albumId,
        title: validated.title,
        artist: validated.artist,
        coverUrl: validated.coverUrl,
        source: validated.source,
      },
    });

    logger.info('Album saved', { albumId: validated.albumId, userId: user.userId });

    return NextResponse.json({
      id: savedAlbum.albumId,
      title: savedAlbum.title,
      artist: savedAlbum.artist,
      coverUrl: savedAlbum.coverUrl,
      source: savedAlbum.source,
      savedAt: savedAlbum.savedAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error('Save album error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to save album' }, { status: 500 });
  }
}
