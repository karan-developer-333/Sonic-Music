import axios from 'axios';
import crypto from 'node-forge';
import { logger } from '../utils/logger';
import { withTimeout, withRetry } from '../utils/retry';
import { withCircuitBreaker } from '../utils/circuitBreaker';
import type { 
  NormalizedSong, 
  NormalizedAlbum, 
  NormalizedArtist, 
  NormalizedPlaylist,
  ServiceResponse, 
  ImageUrl, 
  StreamUrl 
} from '../types/music';

const SAAVN_API_URL = 'https://www.jiosaavn.com/api.php';
const CIRCUIT_BREAKER_KEY = 'saavn';
const MAX_RETRIES = 0;
const SAAVN_TIMEOUT = 8000;

function decryptSaavnUrl(encryptedUrl: string): string {
  if (!encryptedUrl) return '';
  
  // If already a direct URL, return it
  if (encryptedUrl.startsWith('http')) {
    return encryptedUrl.replace('http://', 'https://');
  }
  
  try {
    const key = '38346591';
    const iv = '\0\0\0\0\0\0\0\0';
    
    const encrypted = crypto.util.decode64(encryptedUrl);
    const decipher = crypto.cipher.createDecipher('DES-ECB', key);
    decipher.start({ iv: crypto.util.createBuffer(iv) });
    decipher.update(crypto.util.createBuffer(encrypted));
    decipher.finish();
    const decrypted = decipher.output.getBytes();
    
    return decrypted.replace('http://', 'https://');
  } catch (err) {
    logger.error('Decryption failed', { error: (err as Error).message });
    return '';
  }
}

export const createDownloadLinks = (encryptedMediaUrl: string): StreamUrl[] => {
  if (!encryptedMediaUrl) return [];

  const qualities = [
    { id: '_12', bitrate: 'low' as const, label: '12kbps' },
    { id: '_48', bitrate: 'low' as const, label: '48kbps' },
    { id: '_96', bitrate: 'medium' as const, label: '96kbps' },
    { id: '_160', bitrate: 'high' as const, label: '160kbps' },
    { id: '_320', bitrate: 'veryhigh' as const, label: '320kbps' }
  ];

  try {
    const decryptedBase = decryptSaavnUrl(encryptedMediaUrl);
    
    if (!decryptedBase || !decryptedBase.startsWith('http')) {
      return [];
    }

    return qualities.map((q) => ({
      quality: q.bitrate,
      url: decryptedBase.replace('_96.mp3', `${q.id}.mp3`).replace('http://', 'https://')
    }));
  } catch (err) {
    logger.error('Saavn decryption error', { error: (err as Error).message });
    return [];
  }
};

export const createImageLinks = (link: string): ImageUrl[] => {
  if (!link) return [];

  const qualities: ('50x50' | '150x150' | '500x500')[] = ['50x50', '150x150', '500x500'];
  const qualityRegex = /150x150|50x50/;
  const protocolRegex = /^http:\/\//;

  return qualities.map((quality) => ({
    quality,
    url: link.replace(qualityRegex, quality).replace(protocolRegex, 'https://')
  }));
};

function normalizeSaavnSong(song: any): NormalizedSong {
  console.log('Normalizing Saavn song', song);
  const streamUrls = createDownloadLinks(song.encrypted_media_url || song.encrypted_media_url_v2);
  const thumbnails = createImageLinks(song.image || song.artwork);
  
  const highQualityStream = streamUrls.find(s => s.quality === 'veryhigh')?.url || 
                           streamUrls.find(s => s.quality === 'high')?.url || 
                           streamUrls[streamUrls.length - 1]?.url || '';

  if (!highQualityStream) {
    logger.warn('No valid stream URL found for Saavn song', { id: song.id, title: song.song || song.title });
  }

  return {
    id: `sn_${song.id}`,
    title: song.song || song.title || 'Unknown Title',
    artist: song.primary_artists || song.artist || 'Unknown Artist',
    artistId: song.primary_artists_id ? `sa_${song.primary_artists_id}` : undefined,
    album: song.albumid ? {
      id: `sa_album_${song.albumid}`,
      name: song.album,
      url: song.album_url,
    } : undefined,
    thumbnails,
    thumbnail: thumbnails.find(t => t.quality === '150x150')?.url || song.image || song.artwork || '',
    streamUrls,
    streamUrl: highQualityStream,
    duration: parseInt(song.duration, 10) || undefined,
    releaseDate: song.release_date,
    year: song.year,
    language: song.language,
    playCount: song.play_count ? parseInt(song.play_count, 10) : undefined,
    copyright: song.copyright_text,
    label: song.label,
    source: 'saavn',
  };
}

function normalizeSaavnAlbum(album: any): NormalizedAlbum {
  const thumbnails = createImageLinks(album.image || album.artwork);

  return {
    id: `sa_album_${album.album_id || album.id}`,
    title: album.title || album.album || 'Unknown Album',
    artist: album.primary_artists || album.artist || album.music || 'Various Artists',
    artistId: album.primary_artists_id ? `sa_${album.primary_artists_id}` : undefined,
    thumbnail: thumbnails.find(t => t.quality === '150x150')?.url || album.image || '',
    coverUrl: thumbnails.find(t => t.quality === '500x500')?.url || album.image || '',
    artwork: album.artwork || album.image,
    year: album.year,
    releaseDate: album.release_date,
    language: album.language,
    genre: album.genre,
    songCount: album.song_count ? parseInt(album.song_count, 10) : undefined,
    description: album.description,
    url: album.album_url,
    source: 'saavn',
  };
}

function normalizeSaavnArtist(artist: any): NormalizedArtist {
  const thumbnails = createImageLinks(artist.image || artist.artwork);

  return {
    id: `sa_${artist.id}`,
    name: artist.name || 'Unknown Artist',
    image: thumbnails.find(t => t.quality === '500x500')?.url || artist.image || '',
    thumbnail: thumbnails.find(t => t.quality === '150x150')?.url || artist.image || '',
    languages: artist.languages ? artist.languages.split(',') : undefined,
    bio: artist.bio,
    followerCount: artist.follower_count ? parseInt(artist.follower_count, 10) : undefined,
    source: 'saavn',
  };
}

function normalizeSaavnPlaylist(playlist: any): NormalizedPlaylist {
  const thumbnails = createImageLinks(playlist.image || playlist.artwork);

  return {
    id: `sa_playlist_${playlist.id || playlist.listid}`,
    title: playlist.title || 'Unknown Playlist',
    subtitle: playlist.subtitle,
    thumbnail: thumbnails.find(t => t.quality === '150x150')?.url || playlist.image || '',
    coverUrl: thumbnails.find(t => t.quality === '500x500')?.url || playlist.image || '',
    image: playlist.image,
    songCount: playlist.song_count ? parseInt(playlist.song_count, 10) : undefined,
    username: playlist.username,
    firstname: playlist.firstname,
    lastname: playlist.lastname,
    language: playlist.language,
    source: 'saavn',
  };
}

// --- Semantic Search (Enhanced Search with Ranking) ---

function calculateRelevanceScore(song: NormalizedSong, query: string): number {
  const q = query.toLowerCase().trim();
  const title = song.title.toLowerCase();
  const artist = song.artist.toLowerCase();
  const album = song.album?.name?.toLowerCase() || '';
  
  let score = 0;
  
  // Exact match
  if (title === q || artist === q) score += 100;
  
  // Title starts with query
  if (title.startsWith(q)) score += 50;
  
  // Title contains query
  if (title.includes(q)) score += 30;
  
  // Artist matches
  if (artist.includes(q)) score += 20;
  
  // Album matches
  if (album.includes(q)) score += 10;
  
  // Popularity boost (if play count exists)
  if (song.playCount && song.playCount > 1000000) score += 5;
  
  return score;
}

function rankSearchResults(songs: NormalizedSong[], query: string): NormalizedSong[] {
  return songs
    .map(song => ({ song, score: calculateRelevanceScore(song, query) }))
    .sort((a, b) => b.score - a.score)
    .map(item => item.song);
}

// --- Service Methods ---

export async function searchSaavn(
  query: string, 
  page = 1, 
  limit = 20
): Promise<ServiceResponse<{ songs: NormalizedSong[]; albums: NormalizedAlbum[]; artists: NormalizedArtist[] }>> {
  const fetchFn = async () => {
    const [songsRes, albumsRes, artistsRes] = await Promise.allSettled([
      withTimeout(
        axios.get(SAAVN_API_URL, {
          params: {
            __call: 'search.getResults',
            q: query,
            p: page,
            n: limit,
            _format: 'json',
            _marker: '0',
            api_version: '4',
            ctx: 'web6dot0',
          },
          timeout: 10000,
        }),
        10000
      ),
      withTimeout(
        axios.get(SAAVN_API_URL, {
          params: {
            __call: 'search.getAlbumResults',
            q: query,
            p: page,
            n: Math.min(limit, 10),
            _format: 'json',
            _marker: '0',
            api_version: '4',
            ctx: 'web6dot0',
          },
          timeout: 10000,
        }),
        10000
      ),
      withTimeout(
        axios.get(SAAVN_API_URL, {
          params: {
            __call: 'search.getArtistResults',
            q: query,
            p: page,
            n: Math.min(limit, 10),
            _format: 'json',
            _marker: '0',
            api_version: '4',
            ctx: 'web6dot0',
          },
          timeout: 10000,
        }),
        10000
      )
    ]);

    const songs: NormalizedSong[] = [];
    const albums: NormalizedAlbum[] = [];
    const artists: NormalizedArtist[] = [];

    if (songsRes.status === 'fulfilled') {
      const songData = songsRes.value.data.results || [];
      songs.push(...songData.map(normalizeSaavnSong));
    }

    if (albumsRes.status === 'fulfilled') {
      const albumData = albumsRes.value.data.albums || albumsRes.value.data.results || [];
      albums.push(...albumData.map(normalizeSaavnAlbum));
    }

    if (artistsRes.status === 'fulfilled') {
      const artistData = artistsRes.value.data.artists || artistsRes.value.data.results || [];
      artists.push(...artistData.map(normalizeSaavnArtist));
    }

    // Rank songs by relevance
    const rankedSongs = rankSearchResults(songs, query);

    return {
      data: { songs: rankedSongs, albums, artists },
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:search`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES }),
      async () => ({ data: { songs: [], albums: [], artists: [] }, source: 'saavn' as const })
    );
  } catch (err) {
    logger.error('Saavn search error', { error: (err as Error).message });
    return { error: 'Failed to search Saavn', source: 'saavn' };
  }
}

export async function searchSaavnSongs(query: string, page = 1, limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'search.getResults',
          q: query,
          p: page,
          n: limit,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn search timeout'
    );

    const songs = response.data.results || [];
    const rankedSongs = rankSearchResults(songs.map(normalizeSaavnSong), query);
    
    return {
      data: rankedSongs,
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:search-songs`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES }),
      async () => ({ data: [], source: 'saavn' as const })
    );
  } catch (err) {
    logger.error('Saavn songs search error', { error: (err as Error).message });
    return { error: 'Failed to search Saavn songs', source: 'saavn' };
  }
}

export async function searchSaavnAlbums(query: string, page = 1, limit = 20): Promise<ServiceResponse<NormalizedAlbum[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'search.getAlbumResults',
          q: query,
          p: page,
          n: limit,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn albums search timeout'
    );

    const albums = response.data.albums || response.data.results || [];
    return {
      data: albums.map(normalizeSaavnAlbum),
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:search-albums`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES }),
      async () => ({ data: [], source: 'saavn' as const })
    );
  } catch (err) {
    logger.error('Saavn albums search error', { error: (err as Error).message });
    return { error: 'Failed to search Saavn albums', source: 'saavn' };
  }
}

export async function searchSaavnArtists(query: string, page = 1, limit = 20): Promise<ServiceResponse<NormalizedArtist[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'search.getArtistResults',
          q: query,
          p: page,
          n: limit,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn artists search timeout'
    );

    const artists = response.data.artists || response.data.results || [];
    return {
      data: artists.map(normalizeSaavnArtist),
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:search-artists`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES }),
      async () => ({ data: [], source: 'saavn' as const })
    );
  } catch (err) {
    logger.error('Saavn artists search error', { error: (err as Error).message });
    return { error: 'Failed to search Saavn artists', source: 'saavn' };
  }
}

export async function getTrendingSaavn(page = 1, limit = 20): Promise<ServiceResponse<NormalizedSong[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'content.getTrending',
          p: page,
          n: limit,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn trending timeout'
    );

    const songs = Array.isArray(response.data) ? response.data : (response.data.results || []);
    return {
      data: songs.map(normalizeSaavnSong),
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:trending`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('Saavn trending error', { error: (err as Error).message });
    return { error: 'Failed to fetch trending from Saavn', source: 'saavn' };
  }
}

export async function getBrowseModulesSaavn(language = 'hindi', limit = 20): Promise<ServiceResponse<{
  trending: NormalizedSong[];
  newReleases: NormalizedSong[];
  topCharts: NormalizedSong[];
  romantic: NormalizedSong[];
  albums: NormalizedAlbum[];
}>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'content.getBrowseModules',
          language: language,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 15000,
      }),
      15000,
      'Saavn browse modules timeout'
    );

    const modules = response.data.modules || {};
    const result: {
      trending: NormalizedSong[];
      newReleases: NormalizedSong[];
      topCharts: NormalizedSong[];
      romantic: NormalizedSong[];
      albums: NormalizedAlbum[];
    } = {
      trending: [],
      newReleases: [],
      topCharts: [],
      romantic: [],
      albums: []
    };

    // Parse different module types
    for (const [key, value] of Object.entries(modules)) {
      const moduleData = value as any;
      const items = moduleData.songs || moduleData.albums || moduleData.results || [];
      
      if (items.length > 0) {
        if (key.toLowerCase().includes('trending') || key.toLowerCase().includes('top')) {
          result.trending.push(...items.slice(0, limit).map(normalizeSaavnSong));
        } else if (key.toLowerCase().includes('new') || key.toLowerCase().includes('release')) {
          result.newReleases.push(...items.slice(0, limit).map(normalizeSaavnSong));
        } else if (key.toLowerCase().includes('chart') || key.toLowerCase().includes('top')) {
          result.topCharts.push(...items.slice(0, limit).map(normalizeSaavnSong));
        } else if (key.toLowerCase().includes('romantic') || key.toLowerCase().includes('love')) {
          result.romantic.push(...items.slice(0, limit).map(normalizeSaavnSong));
        } else if (key.toLowerCase().includes('album')) {
          result.albums.push(...items.slice(0, limit).map(normalizeSaavnAlbum));
        } else if (items[0]?.encrypted_media_url || items[0]?.song) {
          // Default to trending for song-like items
          result.trending.push(...items.slice(0, limit).map(normalizeSaavnSong));
        }
      }
    }

    // Deduplicate
    const seenSongIds = new Set<string>();
    for (const category of ['trending', 'newReleases', 'topCharts', 'romantic'] as const) {
      result[category] = result[category].filter(song => {
        if (seenSongIds.has(song.id)) return false;
        seenSongIds.add(song.id);
        return true;
      });
    }

    return { data: result, source: 'saavn' as const };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:browse`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('Saavn browse modules error', { error: (err as Error).message });
    return { error: 'Failed to fetch browse modules from Saavn', source: 'saavn' };
  }
}

export async function getSongByIdSaavn(id: string): Promise<ServiceResponse<NormalizedSong>> {
  // Remove prefix if present
  const cleanId = id.replace(/^sn_/, '');
  
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'song.getDetails',
          pids: cleanId,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn song info timeout'
    );

    const songs = response.data.songs || [];
    if (!songs.length) throw new Error('Song not found');

    return {
      data: normalizeSaavnSong(songs[0]),
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:song:${id}`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('Saavn song info error', { error: (err as Error).message, id });
    return { error: 'Failed to get song from Saavn', source: 'saavn' };
  }
}

export async function getAlbumByIdSaavn(id: string): Promise<ServiceResponse<{ album: NormalizedAlbum; songs: NormalizedSong[] }>> {
  // Remove prefix if present
  const cleanId = id.replace(/^sa_album_/, '');
  
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'content.getAlbumDetails',
          albumid: cleanId,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn album info timeout'
    );

    const albumData = response.data;
    const album = normalizeSaavnAlbum(albumData);
    const songs = (albumData.songs || []).map(normalizeSaavnSong);

    return {
      data: { album, songs },
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:album:${id}`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('Saavn album info error', { error: (err as Error).message, id });
    return { error: 'Failed to get album from Saavn', source: 'saavn' };
  }
}

export async function getArtistByIdSaavn(id: string): Promise<ServiceResponse<{
  artist: NormalizedArtist;
  topSongs: NormalizedSong[];
  popularAlbums: NormalizedAlbum[];
  similarArtists: NormalizedArtist[];
}>> {
  // Remove prefix if present
  const cleanId = id.replace(/^sa_/, '');
  
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'artist.getArtistPageDetails',
          artistid: cleanId,
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 15000,
      }),
      15000,
      'Saavn artist info timeout'
    );

    const artistData = response.data;
    const artist = normalizeSaavnArtist({
      id: cleanId,
      name: artistData.name || artistData.artist_name,
      image: artistData.image || artistData.artist_image,
      languages: artistData.languages,
      bio: artistData.bio,
      follower_count: artistData.follower_count
    });

    const topSongs = (artistData.topSongs || artistData.songs || []).map(normalizeSaavnSong);
    const popularAlbums = (artistData.popularAlbums || artistData.albums || []).map(normalizeSaavnAlbum);
    const similarArtists = (artistData.similarArtists || []).map(normalizeSaavnArtist);

    return {
      data: { artist, topSongs, popularAlbums, similarArtists },
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:artist:${id}`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('Saavn artist info error', { error: (err as Error).message, id });
    return { error: 'Failed to get artist from Saavn', source: 'saavn' };
  }
}

export async function getStreamUrlSaavn(id: string): Promise<ServiceResponse<string>> {
  const songResult = await getSongByIdSaavn(id);
  
  if (songResult.error || !songResult.data) {
    return { error: songResult.error || 'Song not found', source: 'saavn' };
  }

  const streamUrl = songResult.data.streamUrl;
  if (!streamUrl) {
    return { error: 'No stream URL available', source: 'saavn' };
  }

  return { data: streamUrl, source: 'saavn' };
}

export async function getSaavnSuggestions(songId: string, limit = 10): Promise<ServiceResponse<NormalizedSong[]>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'webradio.getSong',
          pids: songId.replace(/^sn_/, ''),
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn suggestions timeout'
    );

    const songs = response.data.songs || response.data || [];
    return {
      data: songs.slice(0, limit).map(normalizeSaavnSong),
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:suggestions:${songId}`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('Saavn suggestions error', { error: (err as Error).message, songId });
    return { error: 'Failed to get suggestions from Saavn', source: 'saavn' };
  }
}

export async function getLyricsSaavn(songId: string): Promise<ServiceResponse<string>> {
  const fetchFn = async () => {
    const response = await withTimeout(
      axios.get(SAAVN_API_URL, {
        params: {
          __call: 'lyrics.getLyrics',
          pids: songId.replace(/^sn_/, ''),
          _format: 'json',
          _marker: '0',
          api_version: '4',
          ctx: 'web6dot0',
        },
        timeout: 10000,
      }),
      10000,
      'Saavn lyrics timeout'
    );

    const lyrics = response.data.lyrics || '';
    return {
      data: lyrics,
      source: 'saavn' as const,
    };
  };

  try {
    return await withCircuitBreaker(
      `${CIRCUIT_BREAKER_KEY}:lyrics:${songId}`,
      () => withRetry(fetchFn, { maxRetries: MAX_RETRIES })
    );
  } catch (err) {
    logger.error('Saavn lyrics error', { error: (err as Error).message, songId });
    return { error: 'Failed to get lyrics from Saavn', source: 'saavn' };
  }
}
