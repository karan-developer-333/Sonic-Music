import { Platform } from 'react-native';
import apiClient from './ApiClient';
import { MediaService } from './MediaService';

const DEBUG_MODE = false;
const CACHE_TTL = 5 * 60 * 1000;

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
    this.cache.delete(key);
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

  static async getSongs(page = 1, pageSize = 20): Promise<PaginatedResponse<Song>> {
    const cacheKey = this.getCacheKey('songs', { page, pageSize });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ songs: SongResponse[]; total: number; hasMore: boolean }>(
        `/trending?limit=${pageSize}`
      );

      return {
        items: response.data.songs.map(this.mapSongResponseToSong),
        total: response.data.total || response.data.songs.length,
        page,
        pageSize,
        hasMore: response.data.hasMore,
      };
    });
  }

  static async getSongById(id: string): Promise<Song> {
    const cacheKey = `song/${id}`;

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ song: SongResponse }>(`/song/${id}`);
      return this.mapSongResponseToSong(response.data.song);
    });
  }

  static async getSongsByCategory(categoryId: string): Promise<Song[]> {
    const cacheKey = this.getCacheKey('songs/category', { categoryId });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ songs: SongResponse[] }>(
        `/search?q=${encodeURIComponent(categoryId)}`
      );
      return response.data.songs.map(this.mapSongResponseToSong);
    });
  }

  static async getPopularSongs(limit = 10): Promise<Song[]> {
    const cacheKey = this.getCacheKey('popular', { limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ songs: SongResponse[] }>(
        `/trending?limit=${limit}`
      );
      return response.data.songs.map(this.mapSongResponseToSong);
    });
  }

  static async getNewReleases(limit = 10): Promise<Song[]> {
    const cacheKey = this.getCacheKey('newreleases', { limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ songs: SongResponse[] }>(
        `/trending?limit=${limit}`
      );
      return response.data.songs.map(this.mapSongResponseToSong);
    });
  }

  static async searchSongs(query: string): Promise<Song[]> {
    if (!query.trim()) return [];

    const cacheKey = this.getCacheKey('search', { q: query });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ songs: SongResponse[] }>(
        `/search?q=${encodeURIComponent(query)}`
      );
      return response.data.songs.map(this.mapSongResponseToSong);
    });
  }

  static async getCategories(): Promise<CategoryResponse[]> {
    const cacheKey = 'categories';

    return ApiCache.getOrFetch(cacheKey, async () => {
      try {
        const response = await apiClient.get<{ categories: CategoryResponse[] }>('/categories');
        return response.data.categories;
      } catch {
        return [];
      }
    });
  }

  static async likeSong(songId: string): Promise<void> {
    ApiCache.invalidate('liked-songs');
    await apiClient.post(`/songs/${songId}/like`, {});
  }

  static async unlikeSong(songId: string): Promise<void> {
    ApiCache.invalidate('liked-songs');
    await apiClient.delete(`/songs/${songId}/like`);
  }

  static async getLikedSongs(): Promise<Song[]> {
    const cacheKey = 'liked-songs';

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<SongResponse[]>('/me/liked-songs');
      return response.data.map(this.mapSongResponseToSong);
    });
  }

  static async getRecommendations(genres: string[] = [], limit = 10): Promise<Song[]> {
    const cacheKey = this.getCacheKey('recommendations', { genres: genres.join(','), limit });

    return ApiCache.getOrFetch(cacheKey, async () => {
      const genresParam = genres.length > 0 ? `?genres=${encodeURIComponent(genres.join(','))}` : '';
      const response = await apiClient.get<{ songs: SongResponse[] }>(
        `/recommendations${genresParam}&limit=${limit}`
      );
      return response.data.songs.map(this.mapSongResponseToSong);
    });
  }

  static async getLocalSongs(): Promise<Song[]> {
    if (Platform.OS === 'web') return [];
    return MediaService.getLocalSongs();
  }

  static async getStreamUrl(songId: string): Promise<string> {
    const cacheKey = `stream/${songId}`;

    return ApiCache.getOrFetch(cacheKey, async () => {
      const response = await apiClient.get<{ streamUrl: string }>(`/stream/${songId}`);
      return response.data.streamUrl;
    });
  }

  static clearCache(): void {
    ApiCache.clear();
  }

  static invalidateCache(key: string): void {
    ApiCache.invalidate(key);
  }

  private static mapSongResponseToSong(response: any): Song {
    return {
      id: response.id,
      title: response.title,
      artist: response.artist,
      coverUrl: response.thumbnail || response.coverUrl || '',
      audioUrl: response.streamUrl || response.audioUrl || '',
      duration: response.duration || 0,
      categoryId: response.genre || response.categoryId || 'unknown',
      source: response.source,
    };
  }
}