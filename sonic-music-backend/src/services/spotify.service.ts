import axios from 'axios';
import { withTimeout } from '../utils/timeout';
import { logger } from '../utils/logger';
import type { NormalizedSong, ServiceResponse } from '../types/music';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const BASE_URL = 'https://api.spotify.com/v1';
const DEV_MODE = process.env.SPOTIFY_DEV_MODE === 'true';
const USE_OAUTH = process.env.SPOTIFY_USE_OAUTH === 'true';
const INDIA_PLAYLIST_ID = process.env.SPOTIFY_INDIA_PLAYLIST_ID || '37i9dQZF1DXcBWIGoYBM5';
const GLOBAL_PLAYLIST_ID = process.env.SPOTIFY_GLOBAL_PLAYLIST_ID || '37i9dQZF1DX0XUsuxWHRQd';

let accessToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    if (DEV_MODE) {
      logger.info('Spotify in DEVELOPMENT mode - using test user: homepc8890@gmail.com');
    } else {
      logger.info('Soliciting new Spotify access token...');
    }
    
    if (!CLIENT_ID || !CLIENT_SECRET) {
      logger.error('Spotify credentials missing in environment variables');
      return null;
    }

    const authHeader = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${authHeader}`,
        },
      }
    );

    if (response.data && response.data.access_token) {
      accessToken = response.data.access_token;
      // Expiry usually 3600s, we buffer by 60s
      tokenExpiry = Date.now() + (response.data.expires_in || 3600) * 1000 - 60000;
      logger.info('Spotify token acquired successfully');
      return accessToken;
    }

    logger.error('Spotify response missing access_token');
    return null;
  } catch (err: any) {
    const status = err.response?.status;
    const errorMessage = err.message;
    
    if (status === 403) {
      logger.error('Spotify 403 Forbidden - Dev mode active - verify test user is added in Spotify Dashboard');
    } else if (status === 401) {
      logger.error('Spotify 401 Unauthorized - Token expired or invalid');
    } else {
      logger.error('Spotify API error', {
        error: errorMessage,
        status,
      });
    }
    return null;
  }
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  preview_url: string | null;
  duration_ms: number;
}

async function fetchFromSpotify<T>(endpoint: string, params = {}): Promise<T | null> {
  const token = await getSpotifyToken();
  if (!token) return null;

  try {
    const response = await withTimeout(
      axios.get(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'Spotify API timeout'
    );
    return response.data;
  } catch (err: any) {
    const status = err.response?.status;
    const errorMessage = err.message;
    
    if (status === 403) {
      logger.error('Spotify 403 Forbidden', {
        endpoint,
        reason: DEV_MODE 
          ? 'Dev mode active - verify test user is added in Spotify Dashboard'
          : 'Check app permissions in Spotify Developer Dashboard',
      });
    } else if (status === 401) {
      logger.error('Spotify 401 Unauthorized - Token expired or invalid');
    } else {
      logger.error('Spotify API error', {
        endpoint,
        error: errorMessage,
        status,
      });
    }
    return null;
  }
}

function normalizeTrack(track: SpotifyTrack): NormalizedSong {
  return {
    id: `sp_${track.id}`,
    title: track.name,
    artist: track.artists?.[0]?.name || 'Unknown Artist',
    thumbnail: track.album?.images?.[0]?.url || '',
    streamUrl: track.preview_url || '',
    source: 'spotify',
  };
}

interface FeaturedPlaylist {
  id: string;
  name: string;
  description: string;
  images: { url: string }[];
  owner: { display_name: string };
  tracks: { total: number };
}

export async function getSpotifyTrending(): Promise<ServiceResponse<NormalizedSong[]>> {
  if (DEV_MODE) {
    logger.info('Dev mode - fetching featured playlists for India');
    const featured = await fetchFromSpotify<{ playlists: { items: FeaturedPlaylist[] } }>('/browse/featured-playlists', {
      country: 'IN',
      limit: 5,
    });

    if (featured?.playlists?.items?.length) {
      const firstPlaylist = featured.playlists.items[0];
      logger.info(`Fetching tracks from featured playlist: ${firstPlaylist.name}`);
      
      const tracks = await fetchFromSpotify<{ tracks: SpotifyTrack[] }>(`/playlists/${firstPlaylist.id}/tracks`, {
        limit: 20,
        market: 'IN',
      });

      if (tracks?.tracks) {
        return {
          data: tracks.tracks.map(normalizeTrack),
          source: 'spotify',
        };
      }
    }
    
    const category = await fetchFromSpotify<{ playlists: { items: FeaturedPlaylist[] } }>('/browse/categories/toplists/playlists', {
      country: 'IN',
      limit: 5,
    });

    if (category?.playlists?.items?.length) {
      const firstPlaylist = category.playlists.items[0];
      logger.info(`Fetching from toplists category: ${firstPlaylist.name}`);
      
      const tracks = await fetchFromSpotify<{ tracks: SpotifyTrack[] }>(`/playlists/${firstPlaylist.id}/tracks`, {
        limit: 20,
        market: 'IN',
      });

      if (tracks?.tracks) {
        return {
          data: tracks.tracks.map(normalizeTrack),
          source: 'spotify',
        };
      }
    }

    return { error: 'Failed to fetch trending from Spotify', source: 'spotify' };
  }

  const playlistId = GLOBAL_PLAYLIST_ID;
  logger.info(`Fetching Spotify global trending playlist: ${playlistId}`);
  
  const data = await fetchFromSpotify<{ tracks: SpotifyTrack[] }>(`/playlists/${playlistId}/tracks`, {
    limit: 20,
  });

  if (!data?.tracks) {
    return { error: 'Failed to fetch trending', source: 'spotify' };
  }

  return {
    data: data.tracks.map(normalizeTrack),
    source: 'spotify',
  };
}

export async function searchSpotify(query: string): Promise<ServiceResponse<NormalizedSong[]>> {
  const data = await fetchFromSpotify<{ tracks: { items: SpotifyTrack[] } }>('/search', {
    q: query,
    type: 'track',
    limit: 20,
    market: 'IN',
  });

  if (!data?.tracks?.items) {
    return { error: 'Failed to search spotify', source: 'spotify' };
  }

  return {
    data: data.tracks.items.map(normalizeTrack),
    source: 'spotify',
  };
}

export async function getSpotifySong(id: string): Promise<ServiceResponse<NormalizedSong>> {
  const trackId = id.replace('sp_', '');
  const data = await fetchFromSpotify<SpotifyTrack>(`/tracks/${trackId}`);

  if (!data) {
    return { error: 'Song not found', source: 'spotify' };
  }

  return {
    data: normalizeTrack(data),
    source: 'spotify',
  };
}

export async function getSpotifyStreamUrl(id: string): Promise<ServiceResponse<string>> {
  const song = await getSpotifySong(id);
  
  if (!song.data) {
    return { error: 'Song not found', source: 'spotify' };
  }

  return {
    data: song.data.streamUrl,
    source: 'spotify',
  };
}

async function fetchFromSpotifyWithToken<T>(token: string, endpoint: string, params = {}): Promise<T | null> {
  try {
    const response = await withTimeout(
      axios.get(`${BASE_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'Spotify API timeout'
    );
    return response.data;
  } catch (err: any) {
    const status = err.response?.status;
    logger.error('Spotify API error with user token', {
      endpoint,
      status,
      error: err.message,
    });
    return null;
  }
}

export async function getSpotifyTrendingWithOAuth(accessToken: string): Promise<ServiceResponse<NormalizedSong[]>> {
  logger.info('Fetching trending with OAuth user token');

  const featured = await fetchFromSpotifyWithToken<{ playlists: { items: FeaturedPlaylist[] } }>(
    accessToken,
    '/browse/featured-playlists',
    { country: 'IN', limit: 5 }
  );

  if (featured?.playlists?.items?.length) {
    const firstPlaylist = featured.playlists.items[0];
    logger.info(`OAuth: Fetching from featured playlist: ${firstPlaylist.name}`);

    const tracks = await fetchFromSpotifyWithToken<{ tracks: SpotifyTrack[] }>(
      accessToken,
      `/playlists/${firstPlaylist.id}/tracks`,
      { limit: 20, market: 'IN' }
    );

    if (tracks?.tracks) {
      return {
        data: tracks.tracks.map(normalizeTrack),
        source: 'spotify',
      };
    }
  }

  const category = await fetchFromSpotifyWithToken<{ playlists: { items: FeaturedPlaylist[] } }>(
    accessToken,
    '/browse/categories/toplists/playlists',
    { country: 'IN', limit: 5 }
  );

  if (category?.playlists?.items?.length) {
    const firstPlaylist = category.playlists.items[0];
    logger.info(`OAuth: Fetching from toplists category: ${firstPlaylist.name}`);

    const tracks = await fetchFromSpotifyWithToken<{ tracks: SpotifyTrack[] }>(
      accessToken,
      `/playlists/${firstPlaylist.id}/tracks`,
      { limit: 20, market: 'IN' }
    );

    if (tracks?.tracks) {
      return {
        data: tracks.tracks.map(normalizeTrack),
        source: 'spotify',
      };
    }
  }

  return { error: 'Failed to fetch trending from Spotify', source: 'spotify' };
}

export async function searchSpotifyWithOAuth(accessToken: string, query: string): Promise<ServiceResponse<NormalizedSong[]>> {
  const data = await fetchFromSpotifyWithToken<{ tracks: { items: SpotifyTrack[] } }>(
    accessToken,
    '/search',
    { q: query, type: 'track', limit: 20, market: 'IN' }
  );

  if (!data?.tracks?.items) {
    return { error: 'Failed to search spotify', source: 'spotify' };
  }

  return {
    data: data.tracks.items.map(normalizeTrack),
    source: 'spotify',
  };
}

export function shouldUseOAuth(): boolean {
  return USE_OAUTH;
}