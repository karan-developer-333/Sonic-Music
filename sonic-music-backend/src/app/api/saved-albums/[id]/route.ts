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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = requireAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const savedAlbum = await prisma.savedAlbum.findUnique({
      where: {
        userId_albumId: {
          userId: user.userId,
          albumId: id,
        },
      },
    });

    if (!savedAlbum) {
      return NextResponse.json({ error: 'Saved album not found' }, { status: 404 });
    }

    await prisma.savedAlbum.delete({
      where: {
        userId_albumId: {
          userId: user.userId,
          albumId: id,
        },
      },
    });

    logger.info('Album unsaved', { albumId: id, userId: user.userId });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Unsave album error', { error: (error as Error).message });
    return NextResponse.json({ error: 'Failed to unsave album' }, { status: 500 });
  }
}
