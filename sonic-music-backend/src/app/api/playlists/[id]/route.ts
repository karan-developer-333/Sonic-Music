export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/utils/logger';

const updatePlaylistSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  coverUrl: z.string().url().optional(),
  isPublic: z.boolean().optional(),
});

function requireAuth(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return null;
  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const playlist = await prisma.playlist.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    if (!playlist) {
      return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
    }

    if (!playlist.isPublic && (!user || playlist.userId !== user.userId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const [songs, totalCount] = await Promise.all([
      prisma.playlistSong.findMany({
        where: { playlistId: id },
        orderBy: { addedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.playlistSong.count({ where: { playlistId: id } }),
    ]);

    return NextResponse.json({
      id: playlist.id,
      name: playlist.name,
      description: playlist.description,
      coverUrl: playlist.coverUrl || songs[0]?.coverUrl,
      isPublic: playlist.isPublic,
      songCount: totalCount,
      createdAt: playlist.createdAt,
      updatedAt: playlist.updatedAt,
      songs: songs.map(s => ({
        id: s.songId,
        title: s.songTitle,
        artist: s.artist,
        coverUrl: s.coverUrl,
        streamUrl: s.streamUrl,
        source: s.source,
        duration: s.duration,
        addedAt: s.addedAt,
      })),
      pagination: {
        limit,
        offset,
        total: totalCount,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    logger.error('Get playlist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to get playlist' }, { status: 500 });
  }
}

export async function PUT(
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
    const validated = updatePlaylistSchema.parse(body);

    const updated = await prisma.playlist.update({
      where: { id },
      data: validated,
    });

    logger.info('Playlist updated', { playlistId: id });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      description: updated.description,
      coverUrl: updated.coverUrl,
      isPublic: updated.isPublic,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error('Update playlist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 });
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

    await prisma.playlist.delete({ where: { id } });

    logger.info('Playlist deleted', { playlistId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Delete playlist error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to delete playlist' }, { status: 500 });
  }
}
