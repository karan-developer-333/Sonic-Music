import axios from 'axios';
import { logger } from '../utils/logger';
import type { SpotifyTokens, SpotifyUser } from '../types/auth';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'https://f1rr36mb-3000.inc1.devtunnels.ms/api/auth/callback';

const SPOTIFY_ACCOUNTS_URL = 'https://accounts.spotify.com';
const SPOTIFY_API_URL = 'https://api.spotify.com/v1';

export function getSpotifyAuthUrl(): string {
  const scopes = [
    'user-read-private',
    'user-read-email',
    'playlist-read-private',
    'playlist-read-collaborative',
    'user-library-read',
    'user-read-recently-played',
  ].join(' ');

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: scopes,
    show_dialog: 'true',
  });

  return `${SPOTIFY_ACCOUNTS_URL}/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<SpotifyTokens | null> {
  try {
    logger.info('Exchanging authorization code for tokens');

    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      `${SPOTIFY_ACCOUNTS_URL}/api/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    if (!access_token || !refresh_token) {
      logger.error('Token exchange missing tokens in response');
      return null;
    }

    const tokens: SpotifyTokens = {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: Date.now() + (expires_in - 60) * 1000,
    };

    logger.info('Token exchange successful');
    return tokens;
  } catch (err: any) {
    logger.error('Token exchange failed', {
      status: err.response?.status,
      error: err.message,
    });
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokens | null> {
  try {
    logger.info('Refreshing access token');

    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      `${SPOTIFY_ACCOUNTS_URL}/api/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    const tokens: SpotifyTokens = {
      accessToken: access_token,
      refreshToken: refresh_token || refreshToken,
      expiresAt: Date.now() + (expires_in - 60) * 1000,
    };

    logger.info('Token refresh successful');
    return tokens;
  } catch (err: any) {
    logger.error('Token refresh failed', {
      status: err.response?.status,
      error: err.message,
    });
    return null;
  }
}

export async function getSpotifyUser(accessToken: string): Promise<{ user: SpotifyUser | null; errorStatus?: number }> {
  try {
    const response = await axios.get(`${SPOTIFY_API_URL}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return {
      user: {
        id: response.data.id,
        display_name: response.data.display_name,
        email: response.data.email,
        images: response.data.images,
      }
    };
  } catch (err: any) {
    const status = err.response?.status;
    logger.error('Failed to get Spotify user', {
      status,
      error: err.message,
    });
    return { user: null, errorStatus: status };
  }
}

export async function getValidAccessToken(refreshToken: string, currentExpiresAt: number): Promise<string | null> {
  if (Date.now() < currentExpiresAt) {
    return null;
  }

  const newTokens = await refreshAccessToken(refreshToken);
  return newTokens?.accessToken || null;
}
