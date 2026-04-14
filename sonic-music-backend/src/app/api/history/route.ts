export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/utils/logger';

const addHistorySchema = z.object({
  songId: z.string(),
  songTitle: z.string(),
  artist: z.string(),
  coverUrl: z.string().optional(),
  source: z.string().default('gaana'),
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

    const history = await prisma.listeningHistory.findMany({
      where: { userId: user.userId },
      orderBy: { playedAt: 'desc' },
      take: limit,
      skip: offset,
      distinct: ['songId'],
    });

    return NextResponse.json({
      history: history.map(h => ({
        id: h.songId,
        title: h.songTitle,
        artist: h.artist,
        coverUrl: h.coverUrl,
        source: h.source,
        duration: h.duration,
        playedAt: h.playedAt,
      })),
    });
  } catch (error) {
    logger.error('Get history error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to get history' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = addHistorySchema.parse(body);

    const historyEntry = await prisma.listeningHistory.create({
      data: {
        userId: user.userId,
        songId: validated.songId,
        songTitle: validated.songTitle,
        artist: validated.artist,
        coverUrl: validated.coverUrl,
        source: validated.source,
        duration: validated.duration,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await prisma.listeningHistory.deleteMany({
      where: {
        userId: user.userId,
        playedAt: { lt: thirtyDaysAgo },
      },
    });

    const maxEntries = 1000;
    const totalCount = await prisma.listeningHistory.count({
      where: { userId: user.userId },
    });

    if (totalCount > maxEntries) {
      const oldestToDelete = await prisma.listeningHistory.findMany({
        where: { userId: user.userId },
        orderBy: { playedAt: 'asc' },
        take: totalCount - maxEntries,
        select: { id: true },
      });

      await prisma.listeningHistory.deleteMany({
        where: {
          id: { in: oldestToDelete.map(e => e.id) },
        },
      });
    }

    logger.info('History entry added', { songId: validated.songId, userId: user.userId });

    return NextResponse.json({
      id: historyEntry.songId,
      title: historyEntry.songTitle,
      artist: historyEntry.artist,
      playedAt: historyEntry.playedAt,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    logger.error('Add history error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to add history' }, { status: 500 });
  }
}
