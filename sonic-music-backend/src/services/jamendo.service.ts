import axios from 'axios';
import { withTimeout } from '../utils/timeout';
import { logger } from '../utils/logger';
import type { NormalizedSong, ServiceResponse } from '../types/music';

const CLIENT_ID = process.env.JAMENDO_CLIENT_ID;
const CLIENT_SECRET = process.env.JAMENDO_CLIENT_SECRET;
const BASE_URL = 'https://api.jamendo.com/v3.0';

interface JamendoTrack {
  id: string;
  name: string;
  artist_name: string;
  image: string;
  audio: string;
  duration: number;
}

async function fetchFromJamendo<T>(endpoint: string, params = {}): Promise<T | null> {
  try {
    const response = await withTimeout(
      axios.get(`${BASE_URL}${endpoint}`, {
        params: {
          client_id: CLIENT_ID,
          format: 'json',
          limit: 20,
          ...params,
        },
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'Jamendo API timeout'
    );
    return response.data;
  } catch (err) {
    logger.error('Jamendo API error', {
      endpoint,
      error: (err as Error).message,
    });
    return null;
  }
}

function normalizeTrack(track: JamendoTrack): NormalizedSong {
  return {
    id: `jm_${track.id}`,
    title: track.name,
    artist: track.artist_name || 'Unknown Artist',
    thumbnail: track.image || '',
    streamUrl: track.audio || '',
    source: 'jamendo',
  };
}

export async function getJamendoTrending(): Promise<ServiceResponse<NormalizedSong[]>> {
  const data = await fetchFromJamendo<{ results: JamendoTrack[] }>('/tracks/', {
    order: 'popularity_total',
    tags: 'indian,bollywood,hindustani,indian classical,indian folk',
    limit: 20,
  });

  if (!data?.results) {
    return { error: 'Failed to fetch trending', source: 'jamendo' };
  }

  return {
    data: data.results.map(normalizeTrack),
    source: 'jamendo',
  };
}

export async function searchJamendo(query: string): Promise<ServiceResponse<NormalizedSong[]>> {
  const data = await fetchFromJamendo<{ results: JamendoTrack[] }>('/tracks/', {
    search: query,
  });

  if (!data?.results) {
    return { error: 'Failed to search jamendo', source: 'jamendo' };
  }

  return {
    data: data.results.map(normalizeTrack),
    source: 'jamendo',
  };
}

export async function getJamendoSong(id: string): Promise<ServiceResponse<NormalizedSong>> {
  const trackId = id.replace('jm_', '');
  const data = await fetchFromJamendo<{ results: JamendoTrack[] }>('/tracks/', {
    id: trackId,
  });

  if (!data?.results?.[0]) {
    return { error: 'Song not found', source: 'jamendo' };
  }

  return {
    data: normalizeTrack(data.results[0]),
    source: 'jamendo',
  };
}

export async function getJamendoStreamUrl(id: string): Promise<ServiceResponse<string>> {
  const song = await getJamendoSong(id);

  if (!song.data) {
    return { error: 'Song not found', source: 'jamendo' };
  }

  return {
    data: song.data.streamUrl,
    source: 'jamendo',
  };
}