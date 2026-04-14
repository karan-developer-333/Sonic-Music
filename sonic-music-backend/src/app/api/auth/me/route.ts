import { NextResponse } from 'next/server';
import { sessionManager } from '@/services/session.service';
import { refreshAccessToken, getSpotifyUser } from '@/services/oauth.service';
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

    const { user: spotifyUser, errorStatus } = await getSpotifyUser(tokens.accessToken);
    
    if (errorStatus === 403) {
      logger.warn('Spotify connection rejected with 403 Forbidden', { userId: session.userId });
      return NextResponse.json({
        authenticated: true,
        verified: false,
        reason: 'FORBIDDEN',
        user: session.user,
        expiresAt: tokens.expiresAt,
      });
    }

    if (spotifyUser) {
      // Update session with fresh user data if needed
      if (JSON.stringify(spotifyUser) !== JSON.stringify(session.user)) {
        sessionManager.updateSession(session.userId, tokens, spotifyUser);
      }
    }

    return NextResponse.json({
      authenticated: true,
      verified: !!spotifyUser,
      user: spotifyUser || session.user,
      expiresAt: tokens.expiresAt,
    });
  } catch (error) {
    logger.error('Session check error', { error });
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
