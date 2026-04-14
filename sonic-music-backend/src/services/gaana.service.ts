import axios from 'axios';
import { logger } from '../utils/logger';
import { withTimeout } from '../utils/timeout';
import type { NormalizedSong, ServiceResponse } from '../types/music';

const GAANAPY_URL = process.env.GAANAPY_URL || 'http://127.0.0.1:8000';

interface GaanaTrack {
  seokey: string;
  album_seokey: string;
  track_id: string;
  title: string;
  artists: string;
  artist_seokeys: string;
  artist_ids: string;
  artist_image: string;
  album: string;
  album_id: string;
  duration: string;
  popularity?: string;
  genres?: string;
  is_explicit?: boolean;
  language?: string;
  label?: string;
  release_date?: string;
  play_count?: string;
  favorite_count?: number;
  song_url?: string;
  album_url?: string;
  images: {
    urls: {
      large_artwork: string;
      medium_artwork: string;
      small_artwork: string;
    };
  };
  stream_urls?: {
    urls: {
      very_high_quality: string;
      high_quality: string;
      medium_quality: string;
      low_quality: string;
    };
  };
}

function normalizeTrack(track: GaanaTrack): NormalizedSong {
  const thumbnail = track.images?.urls?.medium_artwork || track.images?.urls?.small_artwork || '';
  const streamUrl = track.stream_urls?.urls?.high_quality || track.stream_urls?.urls?.medium_quality || '';

  return {
    id: `gn_${track.track_id}`,
    title: track.title || 'Unknown Title',
    artist: track.artists || 'Unknown Artist',
    thumbnail,
    streamUrl,
    source: 'gaana',
  };
}

export async function searchGaana(query: string, limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  try {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/songs/search/`, {
        params: { query, limit },
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'GaanaPy search timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.results || [];

    if (!tracks.length) {
      logger.warn('No songs found from GaanaPy', { query });
      return { data: [], source: 'gaana' };
    }

    return {
      data: tracks.slice(0, limit).map(normalizeTrack),
      source: 'gaana',
    };
  } catch (err) {
    logger.error('GaanaPy search error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to search Gaana', source: 'gaana' };
  }
}

export async function getTrendingGaana(language = 'Hindi', limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  try {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/trending`, {
        params: { language, limit },
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'GaanaPy trending timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.songs || [];

    if (!tracks.length) {
      logger.warn('No trending songs found from GaanaPy', { language });
      return { data: [], source: 'gaana' };
    }

    return {
      data: tracks.slice(0, limit).map(normalizeTrack),
      source: 'gaana',
    };
  } catch (err) {
    logger.error('GaanaPy trending error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch trending from Gaana', source: 'gaana' };
  }
}

export async function getNewReleasesGaana(language = 'Hindi', limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  try {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/newreleases`, {
        params: { language, limit },
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'GaanaPy new releases timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.songs || [];

    if (!tracks.length) {
      logger.warn('No new releases found from GaanaPy', { language });
      return { data: [], source: 'gaana' };
    }

    return {
      data: tracks.slice(0, limit).map(normalizeTrack),
      source: 'gaana',
    };
  } catch (err) {
    logger.error('GaanaPy new releases error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch new releases from Gaana', source: 'gaana' };
  }
}

export async function getChartsGaana(limit = 10): Promise<ServiceResponse<any>> {
  try {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/charts`, {
        params: { limit },
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'GaanaPy charts timeout'
    );

    return {
      data: response.data,
      source: 'gaana',
    };
  } catch (err) {
    logger.error('GaanaPy charts error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch charts from Gaana', source: 'gaana' };
  }
}

export async function getSongBySeokey(seokey: string): Promise<ServiceResponse<NormalizedSong>> {
  try {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/songs/info/`, {
        params: { seokey },
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'GaanaPy song info timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.songs || [];

    if (!tracks.length) {
      logger.warn('Song not found in GaanaPy', { seokey });
      return { error: 'Song not found', source: 'gaana' };
    }

    return {
      data: normalizeTrack(tracks[0]),
      source: 'gaana',
    };
  } catch (err) {
    logger.error('GaanaPy song info error', {
      error: (err as Error).message,
      seokey,
    });
    return { error: 'Failed to get song from Gaana', source: 'gaana' };
  }
}

export async function getStreamUrlBySeokey(seokey: string): Promise<ServiceResponse<string>> {
  const song = await getSongBySeokey(seokey);

  if (!song.data) {
    return { error: 'Song not found', source: 'gaana' };
  }

  if (!song.data.streamUrl) {
    return { error: 'No stream URL available', source: 'gaana' };
  }

  return {
    data: song.data.streamUrl,
    source: 'gaana',
  };
}