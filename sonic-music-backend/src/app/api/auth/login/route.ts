import { NextResponse } from 'next/server';
import { getSpotifyAuthUrl } from '@/services/oauth.service';
import { logger } from '@/utils/logger';

export async function GET() {
  try {
    const USE_OAUTH = process.env.SPOTIFY_USE_OAUTH === 'true';
    
    if (!USE_OAUTH) {
      logger.info('OAuth login requested but SPOTIFY_USE_OAUTH is disabled');
      return NextResponse.json(
        { error: 'OAuth is disabled. Set SPOTIFY_USE_OAUTH=true to enable.' },
        { status: 400 }
      );
    }

    const authUrl = getSpotifyAuthUrl();
    logger.info('Redirecting to Spotify OAuth');

    return NextResponse.redirect(authUrl);
  } catch (error) {
    logger.error('OAuth login error', { error });
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
