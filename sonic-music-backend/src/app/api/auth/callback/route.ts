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

    logger.info('OAuth flow completed successfully', { userId: user?.id });

    return NextResponse.redirect(
      new URL('/?auth_success=true', request.url)
    );
  } catch (error) {
    logger.error('OAuth callback error', { error });
    return NextResponse.redirect(
      new URL('/?auth_error=callback_failed', request.url)
    );
  }
}
