export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/utils/logger';

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
  if (!user) return null;
  return user;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist || playlist.userId !== user.userId) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = addSongSchema.parse(body);

    const existingSong = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId: id,
          songId: validated.songId,
        },
      },
    });

    if (existingSong) {
      return NextResponse.json({ error: 'Song already in playlist' }, { status: 409 });
    }

    const playlistSong = await prisma.playlistSong.create({
      data: {
        playlistId: id,
        songId: validated.songId,
        songTitle: validated.songTitle,
        artist: validated.artist,
        coverUrl: validated.coverUrl,
        streamUrl: validated.streamUrl,
        source: validated.source,
        duration: validated.duration,
      },
    });

    await prisma.playlist.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    logger.info('Song added to playlist', { playlistId: id, songId: validated.songId });

    return NextResponse.json({
      id: playlistSong.id,
      songId: playlistSong.songId,
      title: playlistSong.songTitle,
      artist: playlistSong.artist,
      coverUrl: playlistSong.coverUrl,
      addedAt: playlistSong.addedAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error('Add song to playlist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to add song' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    const playlistSong = await prisma.playlistSong.findUnique({
      where: {
        playlistId_songId: {
          playlistId: id,
          songId,
        },
      },
    });

    return NextResponse.json({ exists: !!playlistSong });
  } catch (error) {
    logger.error('Check song in playlist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to check song' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const playlist = await prisma.playlist.findUnique({ where: { id } });
    if (!playlist || playlist.userId !== user.userId) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');

    if (!songId) {
      return NextResponse.json({ error: 'songId is required' }, { status: 400 });
    }

    await prisma.playlistSong.deleteMany({
      where: {
        playlistId: id,
        songId,
      },
    });

    await prisma.playlist.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    logger.info('Song removed from playlist', { playlistId: id, songId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Remove song from playlist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to remove song' }, { status: 500 });
  }
}
