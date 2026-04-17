import { Platform } from 'react-native';
import apiClient from './ApiClient';
import { MediaService } from './MediaService';
import { PaginatedResponse, Song, Album, Category } from '../../domain/models/MusicModels';

const CACHE_TTL = 5 * 60 * 1000;

interface NormalizedSongResponse {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: {
    id: string;
    name: string;
    url?: string;
  };
  thumbnails?: Array<{ quality: string; url: string }>;
  thumbnail?: string;
  coverUrl?: string;
  streamUrl?: string;
  audioUrl?: string;
  duration?: number;
  releaseDate?: string;
  language?: string;
  year?: string;
  playCount?: number;
  source?: string;
}

interface NormalizedAlbumResponse {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  thumbnail?: string;
  coverUrl?: string;
  artwork?: string;
  year?: string;
  releaseDate?: string;
  language?: string;
  genre?: string;
  songCount?: number;
  description?: string;
  source?: string;
}

interface NormalizedArtistResponse {
  id: string;
  name: string;
  image?: string;
  thumbnail?: string;
  languages?: string[];
  bio?: string;
  followerCount?: number;
  source?: string;
}

interface HomeDataResponse {
  popularSongs: NormalizedSongResponse[];
  trendingSongs: NormalizedSongResponse[];
  newReleases: NormalizedSongResponse[];
  topCharts: NormalizedSongResponse[];
  romanticHindi: NormalizedSongResponse[];
  popularAlbums: NormalizedAlbumResponse[];
  hindiSongs: NormalizedSongResponse[];
}

interface SearchResponse {
  songs: NormalizedSongResponse[];
  albums: NormalizedAlbumResponse[];
  artists: NormalizedArtistResponse[];
  playlists: any[];
  query: string;
  page: number;
  total: number;
  hasMore: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class ApiCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static pending = new Map<string, Promise<any>>();

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  static set<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  static invalidate(key: string): void {
    if (key.includes('*')) {
      const pattern = new RegExp(key.replace('*', '.*'));
      for (const k of this.cache.keys()) {
        if (pattern.test(k)) this.cache.delete(k);
      }
    } else {
      this.cache.delete(key);
    }
  }

  static clear(): void {
    this.cache.clear();
  }

  static async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    skipCache = false
  ): Promise<T> {
    if (!skipCache) {
      const cached = this.get<T>(key);
      if (cached) return cached;
    }

    if (this.pending.has(key)) {
      return this.pending.get(key) as Promise<T>;
    }

    const fetchPromise = fetchFn().then((data) => {
      if (!skipCache) {
        this.set(key, data);
      }
      this.pending.delete(key);
      return data;
    }).catch((error) => {
      this.pending.delete(key);
      throw error;
    });

    this.pending.set(key, fetchPromise);
    return fetchPromise;
  }
}

export class MusicApiService {
  private static getCacheKey(prefix: string, params?: object): string {
    if (!params) return prefix;
    const paramStr = Object.entries(params)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `${prefix}?${paramStr}`;
  }

  private static mapSongResponseToSong(response: NormalizedSongResponse): Song {
    return {
      id: response.id,
      title: response.title,
      artist: response.artist,
      coverUrl: response.thumbnail || response.coverUrl || '',
      audioUrl: response.streamUrl || response.audioUrl || '',
      duration: response.duration || 0,
      categoryId: response.album?.name || response.language || 'unknown',
      source: response.source as 'gaana' | 'saavn' || 'saavn',
    };
  }

  private static mapAlbumResponseToAlbum(response: NormalizedAlbumResponse): Album {
    return {
      id: response.id,
      title: response.title,
      artist: response.artist,
      coverUrl: response.thumbnail || response.coverUrl || response.artwork || '',
      artwork: response.artwork,
      source: response.source as 'gaana' | 'saavn' || 'saavn',
      type: 'album',
      releaseDate: response.releaseDate,
      genre: response.genre,
      language: response.language,
      songCount: response.songCount,
    };
  }

  // --- Home Data ---
  static async getHomeData(): Promise<HomeDataResponse | null> {
    const cacheKey = 'home:v3';

    return ApiCache.getOrFetch(cacheKey, async () => {
      try {
        const response = await apiClient.get<HomeDataResponse>('/home');
        return response.data;
      } catch (error) {
        console.error('Failed to fetch home data:', error);
        return null;
      }
    });
  }

  // --- Trending ---
  static async getSongs(page = 1, pageSize = 20): Promise<PaginatedResponse<Song>> {
    const cacheKey = this.getCacheKey('songs:v3', { page, pageSize });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ 
        songs: NormalizedSongResponse[]; 
        page: number; 
        total: number; 
        hasMore: boolean 
      }>(
        `/trending?page=${page}&limit=${pageSize}`
      );

      return {
        items: response.data.songs.map(this.mapSongResponseToSong),
        total: response.data.total || response.data.songs.length,
        page: response.data.page,
        pageSize,
        hasMore: response.data.hasMore,
      };
    });
  }

  static async getPopularSongs(limit = 10): Promise<Song[]> {
    const cacheKey = this.getCacheKey('popular:v2', { limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      try {
        const response = await apiClient.get<HomeDataResponse>('/home');
        const songs = response.data.popularSongs || [];
        return songs.slice(0, limit).map(this.mapSongResponseToSong);
      } catch {
        const fallback = await apiClient.get<{ songs: NormalizedSongResponse[] }>(`/trending?limit=${limit}`);
        return fallback.data.songs.map(this.mapSongResponseToSong);
      }
    });
  }

  static async getNewReleases(limit = 10): Promise<Song[]> {
    const cacheKey = this.getCacheKey('newreleases:v2', { limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      try {
        const response = await apiClient.get<HomeDataResponse>('/home');
        const songs = response.data.newReleases || [];
        return songs.slice(0, limit).map(this.mapSongResponseToSong);
      } catch {
        const fallback = await apiClient.get<{ songs: NormalizedSongResponse[] }>(`/trending?limit=${limit}&type=newreleases`);
        return fallback.data.songs.map(this.mapSongResponseToSong);
      }
    });
  }

  // --- Search ---
  static async searchSongs(query: string, page = 1, limit = 20): Promise<PaginatedResponse<Song>> {
    if (!query.trim()) return { items: [], total: 0, page: 1, pageSize: limit, hasMore: false };

    const cacheKey = this.getCacheKey('search:v2', { q: query, page, limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<SearchResponse>(
        `/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
      );

      return {
        items: response.data.songs.map(this.mapSongResponseToSong),
        total: response.data.total,
        page: response.data.page,
        pageSize: limit,
        hasMore: response.data.hasMore,
      };
    });
  }

  static async searchAlbums(query: string, page = 1, limit = 20): Promise<PaginatedResponse<Album>> {
    if (!query.trim()) return { items: [], total: 0, page: 1, pageSize: limit, hasMore: false };

    const cacheKey = this.getCacheKey('search:albums:v2', { q: query, page, limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<SearchResponse>(
        `/search?q=${encodeURIComponent(query)}&type=albums&page=${page}&limit=${limit}`
      );

      return {
        items: response.data.albums.map(this.mapAlbumResponseToAlbum),
        total: response.data.albums.length,
        page: response.data.page,
        pageSize: limit,
        hasMore: response.data.hasMore,
      };
    });
  }

  static async searchAll(query: string, page = 1, limit = 20): Promise<{
    songs: Song[];
    albums: Album[];
    artists: NormalizedArtistResponse[];
  }> {
    if (!query.trim()) return { songs: [], albums: [], artists: [] };

    const cacheKey = this.getCacheKey('search:all:v2', { q: query, page, limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<SearchResponse>(
        `/search?q=${encodeURIComponent(query)}&type=all&page=${page}&limit=${limit}`
      );

      return {
        songs: response.data.songs.map(this.mapSongResponseToSong),
        albums: response.data.albums.map(this.mapAlbumResponseToAlbum),
        artists: response.data.artists,
      };
    });
  }

  // --- Explore ---
  static async getExploreSongs(
    page = 1,
    limit = 20,
    language = 'Hindi'
  ): Promise<{ items: Song[]; page: number; total: number; hasMore: boolean }> {
    const cacheKey = this.getCacheKey('explore:songs:v3', { page, limit, language });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ 
        items: NormalizedSongResponse[]; 
        page: number; 
        total: number; 
        hasMore: boolean 
      }>(
        `/explore?page=${page}&limit=${limit}&type=trending&language=${encodeURIComponent(language)}`
      );

      return {
        items: response.data.items.map(this.mapSongResponseToSong),
        page: response.data.page,
        total: response.data.total,
        hasMore: response.data.hasMore,
      };
    });
  }

  static async getExploreAlbums(
    page = 1,
    limit = 20,
    language?: string
  ): Promise<{ items: Album[]; page: number; total: number; hasMore: boolean }> {
    const cacheKey = this.getCacheKey('explore:albums:v3', { page, limit, language: language || 'all' });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const langParam = language ? `&language=${encodeURIComponent(language)}` : '';
      const response = await apiClient.get<{ 
        items: NormalizedAlbumResponse[]; 
        page: number; 
        total: number; 
        hasMore: boolean 
      }>(
        `/explore?page=${page}&limit=${limit}&type=albums${langParam}`
      );

      return {
        items: response.data.items.map(this.mapAlbumResponseToAlbum),
        page: response.data.page,
        total: response.data.total,
        hasMore: response.data.hasMore,
      };
    });
  }

  // --- Albums ---
  static async getAlbums(
    page = 1,
    limit = 20,
    language?: string
  ): Promise<{ items: Album[]; page: number; total: number; hasMore: boolean }> {
    const cacheKey = this.getCacheKey('albums:v2', { page, limit, language: language || 'all' });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const langParam = language ? `&language=${encodeURIComponent(language)}` : '';
      const response = await apiClient.get<{ 
        items: NormalizedAlbumResponse[]; 
        page: number; 
        total: number; 
        hasMore: boolean 
      }>(
        `/albums?page=${page}&limit=${limit}${langParam}`
      );

      return {
        items: response.data.items.map(this.mapAlbumResponseToAlbum),
        page: response.data.page,
        total: response.data.total,
        hasMore: response.data.hasMore,
      };
    });
  }

  static async getAlbumById(id: string): Promise<Album & { tracks: Song[] }> {
    const cacheKey = `album:v2:${id}`;

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ album: NormalizedAlbumResponse; songs: NormalizedSongResponse[] }>(`/albums/${id}`);
      
      return {
        ...this.mapAlbumResponseToAlbum(response.data.album),
        tracks: response.data.songs.map(this.mapSongResponseToSong),
      };
    });
  }

  // --- Song Details ---
  static async getSongById(id: string): Promise<Song> {
    const cacheKey = `song:v2:${id}`;

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ song: NormalizedSongResponse }>(`/song/${id}`);
      return this.mapSongResponseToSong(response.data.song);
    });
  }

  static async getSongsByCategory(categoryId: string): Promise<Song[]> {
    const cacheKey = this.getCacheKey('songs:category:v2', { categoryId });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ songs: NormalizedSongResponse[] }>(
        `/search?q=${encodeURIComponent(categoryId)}`
      );
      return response.data.songs.map(this.mapSongResponseToSong);
    });
  }

  // --- Stream ---
  static async getStreamUrl(songId: string): Promise<string> {
    const cacheKey = `stream:v2:${songId}`;

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ streamUrl: string }>(`/stream/${songId}`);
      return response.data.streamUrl;
    });
  }

  // --- Artist ---
  static async getArtistById(id: string): Promise<{
    artist: NormalizedArtistResponse;
    topSongs: Song[];
    albums: Album[];
  }> {
    const cacheKey = `artist:v2:${id}`;

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{
        artist: NormalizedArtistResponse;
        topSongs: NormalizedSongResponse[];
        albums: NormalizedAlbumResponse[];
      }>(`/artists/${id}`);

      return {
        artist: response.data.artist,
        topSongs: response.data.topSongs?.map(this.mapSongResponseToSong) || [],
        albums: response.data.albums?.map(this.mapAlbumResponseToAlbum) || [],
      };
    });
  }

  static async searchArtists(query: string, page = 1, limit = 20): Promise<{
    artists: NormalizedArtistResponse[];
    page: number;
    total: number;
    hasMore: boolean;
  }> {
    if (!query.trim()) return { artists: [], page: 1, total: 0, hasMore: false };

    const cacheKey = this.getCacheKey('search:artists:v2', { q: query, page, limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{
        artists: NormalizedArtistResponse[];
        page: number;
        total: number;
        hasMore: boolean;
      }>(`/artists?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`);

      return {
        artists: response.data.artists,
        page: response.data.page,
        total: response.data.total,
        hasMore: response.data.hasMore,
      };
    });
  }

  // --- Recommendations ---
  static async getRecommendations(genres: string[] = [], limit = 10): Promise<Song[]> {
    const cacheKey = this.getCacheKey('recommendations:v2', { genres: genres.join(','), limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      try {
        const genresParam = genres.length > 0 ? `?genres=${encodeURIComponent(genres.join(','))}` : '';
        const response = await apiClient.get<{ songs: NormalizedSongResponse[] }>(
          `/recommendations${genresParam}&limit=${limit}`
        );
        return response.data.songs.map(this.mapSongResponseToSong);
      } catch {
        const response = await apiClient.get<HomeDataResponse>('/home');
        const songs = response.data.trendingSongs || response.data.popularSongs || [];
        return songs.slice(0, limit).map(this.mapSongResponseToSong);
      }
    });
  }

  // --- Local Songs ---
  static async getLocalSongs(): Promise<Song[]> {
    if (Platform.OS === 'web') return [];
    return MediaService.getLocalSongs();
  }

  // --- Favorites ---
  static async getFavorites(page = 1, limit = 50): Promise<{ songs: Song[]; hasMore: boolean }> {
    try {
      const response = await apiClient.get<{
        favorites: NormalizedSongResponse[];
        pagination: { hasMore: boolean };
      }>(`/favorites?page=${page}&limit=${limit}`);
      return {
        songs: response.data.favorites.map(this.mapSongResponseToSong),
        hasMore: response.data.pagination.hasMore,
      };
    } catch {
      return { songs: [], hasMore: false };
    }
  }

  static async addToFavorites(song: Song): Promise<boolean> {
    try {
      await apiClient.post('/favorites', {
        songId: song.id,
        songTitle: song.title,
        artist: song.artist,
        coverUrl: song.coverUrl,
        source: song.source || 'saavn',
        duration: song.duration,
      });
      return true;
    } catch {
      return false;
    }
  }

  static async removeFromFavorites(songId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/favorites/${songId}`);
      return true;
    } catch {
      return false;
    }
  }

  static async checkIsFavorite(songId: string): Promise<boolean> {
    try {
      const response = await apiClient.get<{ isFavorite: boolean }>(`/favorites/${songId}`);
      return response.data.isFavorite;
    } catch {
      return false;
    }
  }

  // --- Cache Management ---
  static clearCache(): void {
    ApiCache.clear();
  }

  static invalidateCache(key: string): void {
    ApiCache.invalidate(key);
  }

  static invalidateHomeCache(): void {
    ApiCache.invalidate('home*');
    ApiCache.invalidate('popular*');
    ApiCache.invalidate('trending*');
  }
}
