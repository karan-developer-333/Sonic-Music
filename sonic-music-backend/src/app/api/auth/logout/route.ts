import { NextResponse } from 'next/server';
import { sessionManager } from '@/services/session.service';
import { logger } from '@/utils/logger';

export async function POST() {
  try {
    const sessionId = await sessionManager.getSessionIdFromCookie();
    
    if (sessionId) {
      sessionManager.deleteSession(sessionId);
      logger.info('Session logged out');
    }

    await sessionManager.clearSessionCookie();

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', { error });
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.redirect(new URL('/?auth_error=invalid_logout_method', 'http://localhost:3000'));
}
