export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/utils/logger';

function requireAuth(request: NextRequest) {
  const user = getAuthUser(request);
  if (!user) return null;
  return user;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { songId } = await params;

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { songId } = await params;

    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_songId: {
          userId: user.userId,
          songId,
        },
      },
    });

    return NextResponse.json({ isFavorite: !!favorite });
  } catch (error) {
    logger.error('Check favorite error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to check favorite' }, { status: 500 });
  }
}
