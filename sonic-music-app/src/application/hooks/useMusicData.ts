import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { Song } from '../../domain/models/MusicModels';
import { CategoryResponse } from '../../domain/models/ApiModels';
import { MusicApiService } from '../../data/services/MusicApiService';
import { useAppSelector } from '../store/hooks';
import { selectRecommendations as selectRecommendedGenres } from '../store/slices/historySlice';

const DEBUG = false;

interface UseMusicDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isRefreshing: boolean;
  hasPermission?: boolean;
  requestPermission?: () => Promise<boolean>;
}

interface HomeData {
  popularSongs: Song[];
  newReleases: Song[];
  categories: CategoryResponse[];
  localSongs: Song[];
}

interface UseHomeDataResult extends UseMusicDataResult<HomeData> {
  setActiveCategory: (categoryId: string) => void;
  activeCategory: string;
  filteredSongs: Song[];
}

export function usePopularSongs(limit = 10): UseMusicDataResult<Song[]> {
  const [data, setData] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (fetching.current && !refresh) return;
    fetching.current = true;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const songs = await MusicApiService.getPopularSongs(limit);
      setData(songs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch popular songs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetching.current = false;
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true), isRefreshing };
}

export function useNewReleases(limit = 10): UseMusicDataResult<Song[]> {
  const [data, setData] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (fetching.current && !refresh) return;
    fetching.current = true;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const songs = await MusicApiService.getNewReleases(limit);
      setData(songs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch new releases');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetching.current = false;
    }
  }, [limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true), isRefreshing };
}

export function useCategories(): UseMusicDataResult<CategoryResponse[]> {
  const [data, setData] = useState<CategoryResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (fetching.current && !refresh) return;
    fetching.current = true;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const categories = await MusicApiService.getCategories();
      setData(categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true), isRefreshing };
}

export function useLocalSongs(): UseMusicDataResult<Song[]> {
  const [data, setData] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (Platform.OS === 'web') {
      setData([]);
      setLoading(false);
      return;
    }

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const songs = await MusicApiService.getLocalSongs();
      setData(songs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch local songs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    setHasPermission(true);
    return true;
  }, []);

  return { data, loading, error, refetch: () => fetchData(true), isRefreshing, hasPermission, requestPermission };
}

export function useSongSearch(query: string): UseMusicDataResult<Song[]> {
  const [data, setData] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setData([]);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const songs = await MusicApiService.searchSongs(query);
        setData(songs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  return { data, loading, error, refetch: async () => {}, isRefreshing: false };
}

export function useHomeData(): UseHomeDataResult {
  const [activeCategory, setActiveCategory] = useState('all');
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (fetching.current && !refresh) return;
    fetching.current = true;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [popularSongs, newReleases, categories] = await Promise.allSettled([
        MusicApiService.getPopularSongs(10),
        MusicApiService.getNewReleases(10),
        MusicApiService.getCategories(),
      ]).then((results): [Song[], Song[], CategoryResponse[]] =>
        results.map((r) => (r.status === 'fulfilled' ? r.value : [])) as [Song[], Song[], CategoryResponse[]]
      );

      setHomeData({
        popularSongs: popularSongs || [],
        newReleases: newReleases || [],
        categories: categories || [],
        localSongs: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch home data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredSongs = homeData?.categories.find(c => c.id === activeCategory)
    ? (homeData?.popularSongs.filter(s => s.categoryId === activeCategory) || homeData?.popularSongs || [])
    : homeData?.popularSongs || [];

  return {
    data: homeData,
    loading,
    error,
    refetch: () => fetchData(true),
    isRefreshing,
    setActiveCategory,
    activeCategory,
    filteredSongs,
  };
}

export function useRecommendations(limit = 10): UseMusicDataResult<Song[]> {
  const recommendedGenres = useAppSelector(selectRecommendedGenres(5));
  const [data, setData] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (fetching.current && !refresh) return;
    fetching.current = true;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const genres = recommendedGenres.length > 0 ? recommendedGenres : ['bollywood', 'indian', 'hindustani'];
      const songs = await MusicApiService.getRecommendations(genres, limit);
      setData(songs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetching.current = false;
    }
  }, [limit, recommendedGenres]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true), isRefreshing };
}

export function useLikedSongs(): UseMusicDataResult<Song[]> {
  const [data, setData] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (fetching.current && !refresh) return;
    fetching.current = true;

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const songs = await MusicApiService.getLikedSongs();
      setData(songs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch liked songs');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetching.current = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true), isRefreshing };
}