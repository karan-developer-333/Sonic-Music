import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, selectThemeColors } from '../../application/store/hooks';
import { MusicCard } from '../components/MusicCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { SongCardSkeleton } from '../components/LoadingState';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Song } from '../../domain/models/MusicModels';
import { MusicApiService } from '../../data/services/MusicApiService';

const { width } = Dimensions.get('window');

interface HomeData {
  popularSongs: Song[];
  trendingSongs: Song[];
  newReleases: Song[];
  topCharts: Song[];
  romanticHindi: Song[];
  popularAlbums: any[];
  hindiSongs: Song[];
}

interface SectionHeaderProps {
  title: string;
  onSeeAll?: () => void;
  colors: any;
}

const SectionHeader = memo<SectionHeaderProps>(({ title, onSeeAll, colors }) => (
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    {onSeeAll && (
      <TouchableOpacity onPress={onSeeAll}>
        <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
      </TouchableOpacity>
    )}
  </View>
));

SectionHeader.displayName = 'SectionHeader';

interface HorizontalSongListProps {
  songs: Song[];
  queue: Song[];
  onSongPress: (song: Song, queue: Song[]) => void;
  colors: any;
}

const HorizontalSongList = memo<HorizontalSongListProps>(({ songs, queue, onSongPress, colors }) => {
  if (!songs.length) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
      {songs.map((song) => (
        <MusicCard key={song.id} song={song} onPress={(s) => onSongPress(s, queue)} />
      ))}
    </ScrollView>
  );
});

HorizontalSongList.displayName = 'HorizontalSongList';

interface AlbumCardProps {
  album: any;
  onPress: (albumId: string) => void;
  colors: any;
}

const AlbumCard = memo<AlbumCardProps>(({ album, onPress, colors }) => (
  <TouchableOpacity
    style={[styles.albumCard, { backgroundColor: colors.card }]}
    onPress={() => onPress(album.id)}
    activeOpacity={0.7}
  >
    <Image source={{ uri: album.coverUrl || album.thumbnail }} style={styles.albumImage} />
    <Text style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1}>{album.title}</Text>
  </TouchableOpacity>
));

AlbumCard.displayName = 'AlbumCard';

const DEBOUNCE_MS = 300;

function useDebounce(callback: () => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  
  callbackRef.current = callback;

  const debouncedCallback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callbackRef.current();
    }, delay);
  }, [delay]);

  return debouncedCallback;
}

import { useQueue } from '../../application/hooks/useQueue';
import { createQueueItem } from '../../domain/models/QueueItem';

const HomeScreen = memo(({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);
  const colors = useAppSelector(state => selectThemeColors(state)) as any;
  
  // Zustand State
  const { currentSong, playSong: playZustandSong } = useQueue();

  const { data: homeData, loading, error, refetch, isRefreshing } = useHomeData();

  const debouncedRefetch = useDebounce(refetch, DEBOUNCE_MS);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    MusicApiService.invalidateHomeCache();
    await debouncedRefetch();
    setRefreshing(false);
  }, [debouncedRefetch]);

  const handleSongPress = useCallback((song: Song, queue: Song[]) => {
    const queueItems = queue.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.thumbnail || s.coverUrl,
      audioUrl: s.streamUrl || s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    const startIndex = queueItems.findIndex(item => item.id === song.id);
    playZustandSong(queueItems, startIndex >= 0 ? startIndex : 0);
  }, [playZustandSong]);

  const handleMiniPlayerPress = useCallback(() => navigation.navigate('Player'), [navigation]);
  const handleNavigateToExplore = useCallback(() => navigation.navigate('Explore'), [navigation]);
  const handleNavigateToSearch = useCallback(() => navigation.navigate('Search'), [navigation]);
  const handleNavigateToAlbum = useCallback((albumId: string) => navigation.navigate('AlbumDetail', { albumId }), [navigation]);

  const renderSkeleton = useCallback(() => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.skeletonTitle, { backgroundColor: colors.skeleton }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
        {[1, 2, 3, 4, 5].map((i) => <SongCardSkeleton key={i} />)}
      </ScrollView>
    </View>
  ), [colors]);

  const renderAlbumGrid = useCallback((albums: any[]) => {
    if (!albums.length) return null;

    return (
      <View style={styles.albumGrid}>
        {albums.slice(0, 4).map((album) => (
          <AlbumCard key={album.id} album={album} onPress={handleNavigateToAlbum} colors={colors} />
        ))}
      </View>
    );
  }, [handleNavigateToAlbum, colors]);

  const renderQuickMixSection = useCallback(() => {
    const mixes = [
      { title: 'Hindi Mix', icon: 'headset', color: '#E91E63' },
      { title: 'Romantic', icon: 'heart', color: '#FF5722' },
      { title: 'Workout', icon: 'flash', color: '#2196F3' },
      { title: 'Chill', icon: 'leaf', color: '#4CAF50' },
    ];

    return (
      <View style={styles.section}>
        <SectionHeader title="Quick Mixes" onSeeAll={handleNavigateToExplore} colors={colors} />
        <View style={styles.mixesGrid}>
          {mixes.map((mix, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.mixCard, { backgroundColor: mix.color }]}
              onPress={handleNavigateToSearch}
            >
              <Ionicons name={mix.icon as any} size={24} color="#fff" />
              <Text style={styles.mixTitle}>{mix.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [handleNavigateToExplore, handleNavigateToSearch, colors]);

  if (loading && !homeData) {
    return (
      <SafeContainer padTop={false} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Good Evening,</Text>
            <Text style={[styles.username, { color: colors.text }]}>Sonic Listener</Text>
          </View>
          {renderSkeleton()}
          {renderSkeleton()}
          {renderSkeleton()}
        </ScrollView>
      </SafeContainer>
    );
  }

  if (error && !homeData) {
    return (
      <SafeContainer padTop={false} style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.text }]}>Failed to load content</Text>
            <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={handleRefresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeContainer>
    );
  }

  const popularSongs = homeData?.popularSongs || homeData?.hindiSongs || [];
  const trendingSongs = homeData?.trendingSongs || [];
  const newReleases = homeData?.newReleases || [];
  const romanticHindi = homeData?.romanticHindi || [];
  const topCharts = homeData?.topCharts || [];
  const popularAlbums = homeData?.popularAlbums || [];

  return (
    <SafeContainer padTop={false} style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          currentSong && styles.scrollContentWithPlayer
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textMuted }]}>Good Evening,</Text>
            <Text style={[styles.username, { color: colors.text }]}>Sonic Listener</Text>
          </View>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.secondary }]} onPress={handleNavigateToSearch}>
              <Feather name="search" color={colors.text} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {renderQuickMixSection()}

        {popularSongs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Popular Hindi Music" onSeeAll={handleNavigateToExplore} colors={colors} />
            <HorizontalSongList songs={popularSongs} queue={popularSongs} onSongPress={handleSongPress} colors={colors} />
          </View>
        )}

        {trendingSongs.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Trending Now" onSeeAll={handleNavigateToExplore} colors={colors} />
            <HorizontalSongList songs={trendingSongs} queue={trendingSongs} onSongPress={handleSongPress} colors={colors} />
          </View>
        )}

        {newReleases.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="New Releases" onSeeAll={handleNavigateToExplore} colors={colors} />
            <HorizontalSongList songs={newReleases} queue={newReleases} onSongPress={handleSongPress} colors={colors} />
          </View>
        )}

        {romanticHindi.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Romantic Hindi" onSeeAll={handleNavigateToSearch} colors={colors} />
            <HorizontalSongList songs={romanticHindi} queue={romanticHindi} onSongPress={handleSongPress} colors={colors} />
          </View>
        )}

        {topCharts.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Top Charts" onSeeAll={handleNavigateToExplore} colors={colors} />
            <HorizontalSongList songs={topCharts} queue={topCharts} onSongPress={handleSongPress} colors={colors} />
          </View>
        )}

        {popularAlbums.length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Popular Albums" onSeeAll={handleNavigateToExplore} colors={colors} />
            {renderAlbumGrid(popularAlbums)}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

    </SafeContainer>
  );
});

HomeScreen.displayName = 'HomeScreen';

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: SPACING.md },
  scrollContentWithPlayer: { paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingTop: SPACING.md,
  },
  greeting: { fontSize: 14 },
  username: { fontSize: 24, fontWeight: 'bold' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: SPACING.md, padding: 10, borderRadius: 12 },
  avatarContainer: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: '#A3FF12',
  },
  avatar: { width: '100%', height: '100%' },
  section: { marginBottom: SPACING.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 22, fontWeight: 'bold' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  horizontalList: { paddingLeft: SPACING.lg, paddingRight: SPACING.md },
  skeletonTitle: { width: 120, height: 24, borderRadius: 4 },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  albumCard: {
    width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: SPACING.sm,
  },
  mixesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  mixCard: {
    width: (width - SPACING.lg * 2 - SPACING.sm) / 2,
    padding: SPACING.md,
    borderRadius: SIZES.radius,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mixTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  errorText: {
    fontSize: 18,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 20,
  },
  retryText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
});

export { HomeScreen };
export default HomeScreen;

function useHomeData() {
  const [homeData, setHomeData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetching = useRef(false);

  const fetchData = useCallback(async (refresh = false) => {
    if (fetching.current && !refresh) return;
    fetching.current = true;

    try {
      if (refresh) setIsRefreshing(true);
      else setLoading(true);
      setError(null);

      const data = await MusicApiService.getHomeData();

      if (data) {
        setHomeData({
          popularSongs: (data.popularSongs || data.hindiSongs || []).map((s: any) => ({
            ...s,
            id: s.id,
            title: s.title,
            artist: s.artist,
            coverUrl: s.thumbnail || s.coverUrl || '',
            audioUrl: s.streamUrl || s.audioUrl || '',
            duration: s.duration || 0,
          })),
          trendingSongs: (data.trendingSongs || []).map((s: any) => ({
            ...s,
            id: s.id,
            title: s.title,
            artist: s.artist,
            coverUrl: s.thumbnail || s.coverUrl || '',
            audioUrl: s.streamUrl || s.audioUrl || '',
            duration: s.duration || 0,
          })),
          newReleases: (data.newReleases || []).map((s: any) => ({
            ...s,
            id: s.id,
            title: s.title,
            artist: s.artist,
            coverUrl: s.thumbnail || s.coverUrl || '',
            audioUrl: s.streamUrl || s.audioUrl || '',
            duration: s.duration || 0,
          })),
          topCharts: (data.topCharts || []).map((s: any) => ({
            ...s,
            id: s.id,
            title: s.title,
            artist: s.artist,
            coverUrl: s.thumbnail || s.coverUrl || '',
            audioUrl: s.streamUrl || s.audioUrl || '',
            duration: s.duration || 0,
          })),
          romanticHindi: (data.romanticHindi || []).map((s: any) => ({
            ...s,
            id: s.id,
            title: s.title,
            artist: s.artist,
            coverUrl: s.thumbnail || s.coverUrl || '',
            audioUrl: s.streamUrl || s.audioUrl || '',
            duration: s.duration || 0,
          })),
          popularAlbums: data.popularAlbums || [],
          hindiSongs: (data.hindiSongs || []).map((s: any) => ({
            ...s,
            id: s.id,
            title: s.title,
            artist: s.artist,
            coverUrl: s.thumbnail || s.coverUrl || '',
            audioUrl: s.streamUrl || s.audioUrl || '',
            duration: s.duration || 0,
          })),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch home data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      fetching.current = false;
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    data: homeData,
    loading,
    error,
    refetch: () => fetchData(true),
    isRefreshing,
  };
}
