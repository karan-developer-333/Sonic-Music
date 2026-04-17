import axios from 'axios';
import { logger } from '../utils/logger';
import type { NormalizedSong, NormalizedAlbum, NormalizedArtist, NormalizedPlaylist } from '../types/music';

const NEPOTUNE_BASE_URL = 'https://nepotuneapi.vercel.app/api';
const TIMEOUT = 15000;

interface NepotuneResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    issues?: Array<{ message: string }>;
  };
  message?: string;
}

interface NepotuneSong {
  id: string;
  name: string;
  type: string;
  year: string;
  releaseDate: string | null;
  duration: number;
  label: string;
  explicitContent: boolean;
  playCount: number;
  language: string;
  hasLyrics: boolean;
  lyricsId: string | null;
  url: string;
  copyright: string;
  album?: {
    id: string;
    name: string;
    url: string;
  };
  artists: {
    primary: NepotuneArtist[];
    featured: NepotuneArtist[];
    all: NepotuneArtist[];
  };
  image: Array<{ quality: string; url: string }>;
  downloadUrl: Array<{ quality: string; url: string }>;
}

interface NepotuneAlbum {
  id: string;
  name: string;
  description?: string;
  url: string;
  year: number;
  type: string;
  playCount: number | null;
  language: string;
  explicitContent: boolean;
  artists: {
    primary: NepotuneArtist[];
    featured: NepotuneArtist[];
    all: NepotuneArtist[];
  };
  image: Array<{ quality: string; url: string }>;
  songs?: NepotuneSong[];
  songCount?: number;
}

interface NepotuneArtist {
  id: string;
  name: string;
  role: string;
  image: Array<{ quality: string; url: string }>;
  type: string;
  url: string;
  followerCount?: number;
  fanCount?: string;
  isVerified?: boolean;
  dominantLanguage?: string;
  dominantType?: string;
  bio?: Array<{ text: string; title: string }>;
}

interface NepotunePlaylist {
  id: string;
  name: string;
  type: string;
  image: Array<{ quality: string; url: string }>;
  url: string;
  songCount: number;
  language: string;
  explicitContent: boolean;
}

interface NepotuneSearchResult {
  total: number;
  start: number;
  results: NepotuneSong[] | NepotuneAlbum[] | NepotuneArtist[] | NepotunePlaylist[];
}

function normalizeSong(song: NepotuneSong): NormalizedSong {
  const primaryArtist = song.artists?.primary?.[0];
  
  return {
    id: `np_${song.id}`,
    title: song.name || 'Unknown Title',
    artist: primaryArtist?.name || song.artists?.all?.[0]?.name || 'Unknown Artist',
    artistId: primaryArtist?.id ? `npartist_${primaryArtist.id}` : undefined,
    album: song.album ? {
      id: `np_album_${song.album.id}`,
      name: song.album.name,
      url: song.album.url,
    } : undefined,
    thumbnails: song.image.map(img => ({
      quality: img.quality as any,
      url: img.url,
    })),
    thumbnail: song.image.find(i => i.quality === '150x150')?.url || song.image[0]?.url || '',
    streamUrl: song.downloadUrl.find(d => d.quality === '320kbps')?.url ||
               song.downloadUrl.find(d => d.quality === '160kbps')?.url ||
               song.downloadUrl[0]?.url || '',
    streamUrls: song.downloadUrl.map(d => ({
      quality: d.quality.replace('kbps', '') as any,
      url: d.url,
    })),
    duration: song.duration,
    releaseDate: song.releaseDate || undefined,
    language: song.language,
    year: song.year,
    playCount: song.playCount,
    copyright: song.copyright,
    label: song.label,
    source: 'saavn',
  };
}

function normalizeAlbum(album: NepotuneAlbum): NormalizedAlbum {
  const primaryArtist = album.artists?.primary?.[0];
  
  return {
    id: `np_album_${album.id}`,
    title: album.name || 'Unknown Album',
    artist: primaryArtist?.name || album.artists?.all?.[0]?.name || 'Various Artists',
    artistId: primaryArtist?.id ? `npartist_${primaryArtist.id}` : undefined,
    thumbnail: album.image.find(i => i.quality === '150x150')?.url || album.image[0]?.url || '',
    coverUrl: album.image.find(i => i.quality === '500x500')?.url || album.image[0]?.url || '',
    artwork: album.image[0]?.url,
    year: album.year?.toString(),
    releaseDate: undefined,
    language: album.language,
    genre: undefined,
    songCount: album.songCount,
    description: album.description,
    url: album.url,
    source: 'saavn',
  };
}

function normalizeArtist(artist: NepotuneArtist): NormalizedArtist {
  return {
    id: `npartist_${artist.id}`,
    name: artist.name || 'Unknown Artist',
    image: artist.image.find(i => i.quality === '500x500')?.url || artist.image[0]?.url || '',
    thumbnail: artist.image.find(i => i.quality === '150x150')?.url || artist.image[0]?.url || '',
    languages: artist.dominantLanguage ? [artist.dominantLanguage] : undefined,
    bio: artist.bio?.map(b => b.text).join('\n'),
    followerCount: artist.followerCount,
    source: 'saavn',
  };
}

function normalizePlaylist(playlist: NepotunePlaylist): NormalizedPlaylist {
  return {
    id: `np_playlist_${playlist.id}`,
    title: playlist.name || 'Unknown Playlist',
    thumbnail: playlist.image.find(i => i.quality === '150x150')?.url || playlist.image[0]?.url || '',
    coverUrl: playlist.image.find(i => i.quality === '500x500')?.url || playlist.image[0]?.url || '',
    image: playlist.image[0]?.url,
    songCount: playlist.songCount,
    language: playlist.language,
    source: 'saavn',
  };
}

export async function searchNepotuneSongs(query: string, page = 1, limit = 20): Promise<{ songs: NormalizedSong[]; total: number }> {
  try {
    const response = await axios.get<NepotuneResponse<NepotuneSearchResult>>(
      `${NEPOTUNE_BASE_URL}/search/songs`,
      {
        params: { query, page, limit },
        timeout: TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      const results = response.data.data.results as NepotuneSong[];
      return {
        songs: results.map(normalizeSong),
        total: response.data.data.total,
      };
    }

    logger.error('Nepotune songs search failed', { query, error: response.data.message });
    return { songs: [], total: 0 };
  } catch (err) {
    logger.error('Nepotune songs search error', { query, error: (err as Error).message });
    return { songs: [], total: 0 };
  }
}

export async function searchNepotuneAlbums(query: string, page = 1, limit = 20): Promise<{ albums: NormalizedAlbum[]; total: number }> {
  try {
    const response = await axios.get<NepotuneResponse<NepotuneSearchResult>>(
      `${NEPOTUNE_BASE_URL}/search/albums`,
      {
        params: { query, page, limit },
        timeout: TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      const results = response.data.data.results as NepotuneAlbum[];
      return {
        albums: results.map(normalizeAlbum),
        total: response.data.data.total,
      };
    }

    logger.error('Nepotune albums search failed', { query, error: response.data.message });
    return { albums: [], total: 0 };
  } catch (err) {
    logger.error('Nepotune albums search error', { query, error: (err as Error).message });
    return { albums: [], total: 0 };
  }
}

export async function searchNepotuneArtists(query: string, page = 1, limit = 20): Promise<{ artists: NormalizedArtist[]; total: number }> {
  try {
    const response = await axios.get<NepotuneResponse<NepotuneSearchResult>>(
      `${NEPOTUNE_BASE_URL}/search/artists`,
      {
        params: { query, page, limit },
        timeout: TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      const results = response.data.data.results as NepotuneArtist[];
      return {
        artists: results.map(normalizeArtist),
        total: response.data.data.total,
      };
    }

    logger.error('Nepotune artists search failed', { query, error: response.data.message });
    return { artists: [], total: 0 };
  } catch (err) {
    logger.error('Nepotune artists search error', { query, error: (err as Error).message });
    return { artists: [], total: 0 };
  }
}

export async function searchNepotunePlaylists(query: string, page = 1, limit = 20): Promise<{ playlists: NormalizedPlaylist[]; total: number }> {
  try {
    const response = await axios.get<NepotuneResponse<NepotuneSearchResult>>(
      `${NEPOTUNE_BASE_URL}/search/playlists`,
      {
        params: { query, page, limit },
        timeout: TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      const results = response.data.data.results as NepotunePlaylist[];
      return {
        playlists: results.map(normalizePlaylist),
        total: response.data.data.total,
      };
    }

    logger.error('Nepotune playlists search failed', { query, error: response.data.message });
    return { playlists: [], total: 0 };
  } catch (err) {
    logger.error('Nepotune playlists search error', { query, error: (err as Error).message });
    return { playlists: [], total: 0 };
  }
}

export async function searchNepotuneAll(query: string, page = 1, limit = 20): Promise<{
  songs: NormalizedSong[];
  albums: NormalizedAlbum[];
  artists: NormalizedArtist[];
  playlists: NormalizedPlaylist[];
  total: number;
}> {
  try {
    const [songsResult, albumsResult, artistsResult, playlistsResult] = await Promise.all([
      searchNepotuneSongs(query, page, limit),
      searchNepotuneAlbums(query, page, Math.min(limit, 10)),
      searchNepotuneArtists(query, page, Math.min(limit, 10)),
      searchNepotunePlaylists(query, page, Math.min(limit, 10)),
    ]);

    return {
      songs: songsResult.songs,
      albums: albumsResult.albums,
      artists: artistsResult.artists,
      playlists: playlistsResult.playlists,
      total: songsResult.total,
    };
  } catch (err) {
    logger.error('Nepotune search all error', { query, error: (err as Error).message });
    return {
      songs: [],
      albums: [],
      artists: [],
      playlists: [],
      total: 0,
    };
  }
}

export async function getNepotuneSong(id: string): Promise<NormalizedSong | null> {
  try {
    const cleanId = id.replace(/^np_/, '');
    const response = await axios.get<NepotuneResponse<NepotuneSong>>(
      `${NEPOTUNE_BASE_URL}/songs`,
      {
        params: { id: cleanId },
        timeout: TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      return normalizeSong(response.data.data);
    }

    logger.error('Nepotune get song failed', { id, error: response.data.message });
    return null;
  } catch (err) {
    logger.error('Nepotune get song error', { id, error: (err as Error).message });
    return null;
  }
}

export async function getNepotuneAlbum(id: string): Promise<{ album: NormalizedAlbum; songs: NormalizedSong[] } | null> {
  try {
    const cleanId = id.replace(/^np_album_/, '');
    const response = await axios.get<NepotuneResponse<NepotuneAlbum>>(
      `${NEPOTUNE_BASE_URL}/albums`,
      {
        params: { id: cleanId },
        timeout: TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      const albumData = response.data.data;
      return {
        album: normalizeAlbum(albumData),
        songs: (albumData.songs || []).map(normalizeSong),
      };
    }

    logger.error('Nepotune get album failed', { id, error: response.data.message });
    return null;
  } catch (err) {
    logger.error('Nepotune get album error', { id, error: (err as Error).message });
    return null;
  }
}

export async function getNepotuneArtist(id: string): Promise<{
  artist: NormalizedArtist;
  topSongs: NormalizedSong[];
  albums: NormalizedAlbum[];
} | null> {
  try {
    const cleanId = id.replace(/^npartist_/, '');
    const response = await axios.get<NepotuneResponse<any>>(
      `${NEPOTUNE_BASE_URL}/artists`,
      {
        params: { id: cleanId },
        timeout: TIMEOUT,
      }
    );

    if (response.data.success && response.data.data) {
      const artistData = response.data.data;
      return {
        artist: normalizeArtist(artistData as NepotuneArtist),
        topSongs: (artistData.topSongs || []).map(normalizeSong),
        albums: (artistData.albums || []).map(normalizeAlbum),
      };
    }

    logger.error('Nepotune get artist failed', { id, error: response.data.message });
    return null;
  } catch (err) {
    logger.error('Nepotune get artist error', { id, error: (err as Error).message });
    return null;
  }
}

export async function getTrendingNepotune(language = 'hindi', limit = 50): Promise<NormalizedSong[]> {
  try {
    const queries = [
      `${language} songs`,
      `top ${language} hits`,
      `best ${language} songs`,
      `${language} trending`,
    ];

    const results = await Promise.all(
      queries.map(query => searchNepotuneSongs(query, 1, Math.min(limit, 20)))
    );

    const allSongs: NormalizedSong[] = results.flatMap(r => r.songs);

    const seen = new Set<string>();
    const unique = allSongs.filter(song => {
      if (seen.has(song.id)) return false;
      seen.add(song.id);
      return true;
    });

    return unique.slice(0, limit);
  } catch (err) {
    logger.error('Nepotune trending error', { error: (err as Error).message });
    return [];
  }
}
