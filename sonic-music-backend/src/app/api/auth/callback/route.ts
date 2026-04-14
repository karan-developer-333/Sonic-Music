import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getSpotifyUser } from '@/services/oauth.service';
import { sessionManager } from '@/services/session.service';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      logger.error('Spotify OAuth error', { error });
      return NextResponse.redirect(
        new URL(`/?auth_error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      logger.error('No authorization code received');
      return NextResponse.redirect(
        new URL('/?auth_error=no_code', request.url)
      );
    }

    logger.info('Received OAuth callback with code');

    const tokens = await exchangeCodeForTokens(code);
    if (!tokens) {
      return NextResponse.redirect(
        new URL('/?auth_error=token_exchange_failed', request.url)
      );
    }

    const user = await getSpotifyUser(tokens.accessToken);
    if (!user) {
      logger.warn('Could not fetch user profile, continuing without it');
    }

    const session = sessionManager.createSession(tokens, user || undefined);
    await sessionManager.setSessionCookie(session.userId);

    const APP_SCHEME = process.env.APP_SCHEME || 'sonic-music';
    const redirectUrl = `${APP_SCHEME}://auth-callback?sessionId=${session.userId}&access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}&expires_at=${tokens.expiresAt}`;

    logger.info('OAuth flow completed successfully, redirecting to app', { userId: user?.id });

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    logger.error('OAuth callback error', { error });
    const APP_SCHEME = process.env.APP_SCHEME || 'sonic-music';
    return NextResponse.redirect(`${APP_SCHEME}://auth-callback?error=callback_failed`);
  }
}
