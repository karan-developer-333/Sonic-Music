import axios from 'axios';
import { logger } from '../utils/logger';
import { withTimeout, withRetry } from '../utils/retry';
import { withCircuitBreaker } from '../utils/circuitBreaker';
import type { NormalizedSong, ServiceResponse, ImageUrl, StreamUrl } from '../types/music';

const GAANAPY_URL = process.env.GAANAPY_URL || 'http://127.0.0.1:8000';
const CIRCUIT_BREAKER_KEY = 'gaana';
const MAX_RETRIES = 0;
const GAANA_TIMEOUT = 3000;

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
  const thumbnails: ImageUrl[] = [];
  if (track.images?.urls?.small_artwork) thumbnails.push({ quality: '50x50', url: track.images.urls.small_artwork });
  if (track.images?.urls?.medium_artwork) thumbnails.push({ quality: '150x150', url: track.images.urls.medium_artwork });
  if (track.images?.urls?.large_artwork) thumbnails.push({ quality: '500x500', url: track.images.urls.large_artwork });

  const streamUrls: StreamUrl[] = [];
  if (track.stream_urls?.urls?.low_quality) streamUrls.push({ quality: 'low', url: track.stream_urls.urls.low_quality });
  if (track.stream_urls?.urls?.medium_quality) streamUrls.push({ quality: 'medium', url: track.stream_urls.urls.medium_quality });
  if (track.stream_urls?.urls?.high_quality) streamUrls.push({ quality: 'high', url: track.stream_urls.urls.high_quality });
  if (track.stream_urls?.urls?.very_high_quality) streamUrls.push({ quality: 'veryhigh', url: track.stream_urls.urls.very_high_quality });

  return {
    id: `gn_${track.track_id}`,
    title: track.title || 'Unknown Title',
    artist: track.artists || 'Unknown Artist',
    album: {
      id: track.album_id,
      name: track.album,
      url: track.album_url,
    },
    thumbnails,
    thumbnail: track.images?.urls?.medium_artwork || track.images?.urls?.small_artwork || '',
    streamUrls,
    streamUrl: track.stream_urls?.urls?.high_quality || track.stream_urls?.urls?.medium_quality || '',
    duration: parseInt(track.duration || '0', 10),
    releaseDate: track.release_date,
    language: track.language,
    source: 'gaana',
  };
}

export async function searchGaana(query: string, limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/songs/search/`, {
        params: { query, limit },
        timeout: GAANA_TIMEOUT,
      }),
      GAANA_TIMEOUT,
      'GaanaPy search timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.results || [];

    if (!tracks.length) {
      logger.warn('No songs found from GaanaPy', { query });
      return { data: [], source: 'gaana' as const };
    }

    return {
      data: tracks.slice(0, limit).map(normalizeTrack),
      source: 'gaana' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:search`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES }),
      async () => ({ data: [], source: 'gaana' as const })
    );
  } catch (err) {
    logger.error('GaanaPy search error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to search Gaana', source: 'gaana' };
  }
}

export async function getTrendingGaana(language = 'Hindi', limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/trending`, {
        params: { language, limit },
        timeout: GAANA_TIMEOUT,
      }),
      GAANA_TIMEOUT,
      'GaanaPy trending timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.songs || [];

    if (!tracks.length) {
      logger.warn('No trending songs found from GaanaPy', { language });
      return { data: [], source: 'gaana' as const };
    }

    return {
      data: tracks.slice(0, limit).map(normalizeTrack),
      source: 'gaana' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:trending`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('GaanaPy trending error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch trending from Gaana', source: 'gaana' };
  }
}

export async function getNewReleasesGaana(language = 'Hindi', limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/newreleases`, {
        params: { language, limit },
        timeout: GAANA_TIMEOUT,
      }),
      GAANA_TIMEOUT,
      'GaanaPy new releases timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.songs || [];

    if (!tracks.length) {
      logger.warn('No new releases found from GaanaPy', { language });
      return { data: [], source: 'gaana' as const };
    }

    return {
      data: tracks.slice(0, limit).map(normalizeTrack),
      source: 'gaana' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:newreleases`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('GaanaPy new releases error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch new releases from Gaana', source: 'gaana' };
  }
}

export async function getChartsGaana(limit = 10): Promise<ServiceResponse<any>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/charts`, {
        params: { limit },
        timeout: GAANA_TIMEOUT,
      }),
      GAANA_TIMEOUT,
      'GaanaPy charts timeout'
    );

    return {
      data: response.data,
      source: 'gaana' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:charts`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('GaanaPy charts error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch charts from Gaana', source: 'gaana' };
  }
}

export async function getSongBySeokey(seokey: string): Promise<ServiceResponse<NormalizedSong>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/songs/info/`, {
        params: { seokey },
        timeout: GAANA_TIMEOUT,
      }),
      GAANA_TIMEOUT,
      'GaanaPy song info timeout'
    );

    const tracks: GaanaTrack[] = Array.isArray(response.data) ? response.data : response.data.songs || [];

    if (!tracks.length) {
      logger.warn('Song not found in GaanaPy', { seokey });
      return { error: 'Song not found', source: 'gaana' as const };
    }

    return {
      data: normalizeTrack(tracks[0]),
      source: 'gaana' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:song:${seokey}`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
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

interface GaanaAlbum {
  album_id: string;
  album_seokey: string;
  title: string;
  artists: string;
  artist_seokeys: string;
  artist_ids: string;
  artist_image: string;
  duration?: string;
  release_date?: string;
  genre?: string;
  language?: string;
  label?: string;
  play_count?: string;
  favorite_count?: number;
  songs_count?: string;
  album_url?: string;
  images: {
    urls: {
      large_artwork: string;
      medium_artwork: string;
      small_artwork: string;
    };
  };
}

function normalizeAlbum(album: GaanaAlbum): any {
  const artwork = album.images?.urls?.medium_artwork || album.images?.urls?.small_artwork || '';
  return {
    id: `gn_album_${album.album_id}`,
    title: album.title || 'Unknown Album',
    artist: album.artists || 'Various Artists',
    coverUrl: artwork,
    artwork,
    source: 'gaana',
    type: 'album',
    releaseDate: album.release_date,
    genre: album.genre,
    language: album.language,
    songCount: parseInt(album.songs_count || '0', 10),
  };
}

interface GaanaChart {
  seokey: string;
  playlist_id: string;
  title: string;
  language?: string;
  favorite_count?: number;
  is_explicit?: boolean;
  play_count?: string;
  playlist_url?: string;
  images: {
    urls: {
      large_artwork: string;
      medium_artwork: string;
      small_artwork: string;
    };
  };
}

function normalizeChartToAlbum(chart: GaanaChart): any {
  const artwork = chart.images?.urls?.medium_artwork || chart.images?.urls?.small_artwork || '';
  return {
    id: `gn_playlist_${chart.playlist_id}`,
    title: chart.title || 'Unknown Playlist',
    artist: chart.language ? `${chart.language} Music` : 'Gaana',
    coverUrl: artwork,
    artwork,
    source: 'gaana',
    type: 'album',
    language: chart.language,
    playlistUrl: chart.playlist_url,
  };
}

export async function getAlbumsGaana(page = 1, limit = 20): Promise<ServiceResponse<any[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/charts`, {
        params: { limit },
        timeout: GAANA_TIMEOUT,
      }),
      GAANA_TIMEOUT,
      'GaanaPy charts timeout'
    );

    const charts: GaanaChart[] = Array.isArray(response.data) 
      ? response.data 
      : response.data.results || [];

    if (!charts.length) {
      logger.warn('No charts found from GaanaPy');
      return { data: [], source: 'gaana' as const };
    }

    return {
      data: charts.slice(0, limit).map(normalizeChartToAlbum),
      source: 'gaana' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:albums`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('GaanaPy albums error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch albums from Gaana', source: 'gaana' };
  }
}

export async function getAlbumBySeokey(seokey: string): Promise<ServiceResponse<any>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(`${GAANAPY_URL}/albums/info/`, {
        params: { seokey },
        timeout: GAANA_TIMEOUT,
      }),
      GAANA_TIMEOUT,
      'GaanaPy album info timeout'
    );

    const album: GaanaAlbum = response.data.album || response.data;
    const songs: GaanaTrack[] = response.data.songs || [];

    if (!album.album_id) {
      logger.warn('Album not found in GaanaPy', { seokey });
      return { error: 'Album not found', source: 'gaana' as const };
    }

    const normalizedAlbum = normalizeAlbum(album);
    normalizedAlbum.tracks = songs.map(normalizeTrack);

    return {
      data: normalizedAlbum,
      source: 'gaana' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:album:${seokey}`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('GaanaPy album info error', {
      error: (err as Error).message,
      seokey,
    });
    return { error: 'Failed to get album from Gaana', source: 'gaana' };
  }
}