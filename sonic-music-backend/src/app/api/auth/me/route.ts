import { NextResponse } from 'next/server';
import { sessionManager } from '@/services/session.service';
import { refreshAccessToken } from '@/services/oauth.service';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const session = await sessionManager.getCurrentSession();

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let tokens = session.tokens;
    if (sessionManager.isTokenExpired(session.tokens)) {
      logger.info('Token expired, refreshing...');
      const newTokens = await refreshAccessToken(session.tokens.refreshToken);
      
      if (!newTokens) {
        await sessionManager.clearSessionCookie();
        return NextResponse.json({ authenticated: false, reason: 'token_refresh_failed' }, { status: 401 });
      }

      tokens = newTokens;
      sessionManager.updateSession(session.userId, newTokens, session.user);
    }

    return NextResponse.json({
      authenticated: true,
      user: session.user,
      expiresAt: tokens.expiresAt,
    });
  } catch (error) {
    logger.error('Session check error', { error });
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
