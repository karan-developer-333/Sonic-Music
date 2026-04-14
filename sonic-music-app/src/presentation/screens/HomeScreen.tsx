import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity, 
  RefreshControl,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playSong } from '../../application/store/slices/playerSlice';
import { MusicCard } from '../components/MusicCard';
import { MiniPlayer } from '../components/MiniPlayer';
import { SongCardSkeleton } from '../components/LoadingState';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { Song } from '../../domain/models/MusicModels';
import { MusicApiService } from '../../data/services/MusicApiService';

export const HomeScreen = ({ navigation }: any) => {
  const [refreshing, setRefreshing] = useState(false);

  const { currentSong } = useAppSelector(state => state.player);
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();

  const { data: homeData, loading, error, refetch, isRefreshing } = useHomeData();

  const popularSongs = useMemo(() => homeData?.popularSongs || [], [homeData?.popularSongs]);
  const newCollections = useMemo(() => homeData?.newReleases || [], [homeData?.newReleases]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSongPress = (song: Song) => {
    const queue = popularSongs.length > 0 ? popularSongs : [];
    dispatch(playSong({ song, queue }));
  };

  const handleMiniPlayerPress = () => navigation.navigate('Player');
  const handleNavigateToLibrary = () => navigation.navigate('Library');
  const handleNavigateToPlaylist = (playlistId: string) => navigation.navigate('PlaylistDetail', { playlistId });

  const renderPopularSection = () => {
    if (loading && !homeData) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Songs</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {[1, 2, 3].map((i) => <SongCardSkeleton key={i} />)}
          </ScrollView>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Songs</Text>
          </View>
          <Text style={{ color: colors.textMuted, paddingHorizontal: SPACING.lg }}>Error loading songs</Text>
        </View>
      );
    }

    if (!popularSongs.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Popular Songs</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {popularSongs.map((song: Song) => (
            <MusicCard key={song.id} song={song} onPress={handleSongPress} />
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderNewCollectionSection = () => {
    if (!newCollections.length) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>New Releases</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Search')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.grid}>
          {newCollections.slice(0, 3).map((song: Song) => (
            <TouchableOpacity
              key={song.id}
              style={[styles.collectionItem, { backgroundColor: colors.card }]}
              onPress={() => handleSongPress(song)}
            >
              <Image source={{ uri: song.coverUrl }} style={styles.collectionCover} />
              <View style={styles.collectionInfo}>
                <Text style={[styles.collectionTitle, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
                <Text style={[styles.collectionArtist, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderQuickAccessSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Access</Text>
      </View>

      <TouchableOpacity
        style={[styles.quickAccessItem, { backgroundColor: colors.card }]}
        onPress={handleNavigateToLibrary}
      >
        <View style={[styles.quickAccessIcon, { backgroundColor: colors.secondary }]}>
          <Ionicons name="musical-notes" size={24} color={colors.primary} />
        </View>
        <View style={styles.quickAccessInfo}>
          <Text style={[styles.quickAccessTitle, { color: colors.text }]}>Device Library</Text>
          <Text style={[styles.quickAccessSubtitle, { color: colors.textMuted }]}>Your local music</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickAccessItem, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('Search')}
      >
        <View style={[styles.quickAccessIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="list" size={24} color={colors.primary} />
        </View>
        <View style={styles.quickAccessInfo}>
          <Text style={[styles.quickAccessTitle, { color: colors.text }]}>Browse Playlists</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

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
            <TouchableOpacity style={[styles.iconButton, { backgroundColor: colors.secondary }]}>
              <Feather name="bell" color={colors.text} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatarContainer}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100' }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {renderPopularSection()}
        {renderNewCollectionSection()}
        {renderQuickAccessSection()}

        <View style={{ height: 120 }} />
      </ScrollView>

      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: SPACING.md },
  scrollContentWithPlayer: { paddingBottom: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
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
  sectionTitle: { fontSize: 20, fontWeight: 'bold' },
  seeAll: { fontSize: 14 },
  horizontalList: { paddingLeft: SPACING.lg },
  grid: { paddingHorizontal: SPACING.lg },
  collectionItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.radius,
    marginBottom: SPACING.md, padding: SPACING.sm,
  },
  collectionCover: { width: 60, height: 60, borderRadius: 12, marginRight: SPACING.md },
  collectionInfo: { flex: 1 },
  collectionTitle: { fontSize: 16, fontWeight: 'bold' },
  collectionArtist: { fontSize: 14, marginTop: 2 },
  quickAccessItem: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    padding: SPACING.md, borderRadius: SIZES.radius,
  },
  quickAccessIcon: {
    width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
  },
  quickAccessInfo: { flex: 1, marginLeft: SPACING.md },
  quickAccessTitle: { fontSize: 16, fontWeight: '600' },
  quickAccessSubtitle: { fontSize: 14, marginTop: 2 },
});

export default HomeScreen;

function useHomeData() {
  const [homeData, setHomeData] = useState<any>(null);
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

      const [popularSongs, newReleases, categories] = await Promise.allSettled([
        MusicApiService.getPopularSongs(10),
        MusicApiService.getNewReleases(10),
        MusicApiService.getCategories(),
      ]).then(results => results.map((r) => (r.status === 'fulfilled' ? r.value : [])));

      setHomeData({ popularSongs, newReleases, categories, localSongs: [] });
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