import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playSong } from '../../application/store/slices/playerSlice';
import { MiniPlayer } from '../components/MiniPlayer';
import { CategoryChip } from '../components/CategoryChip';
import { Song, Album } from '../../domain/models/MusicModels';
import { MusicApiService } from '../../data/services/MusicApiService';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';


const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;
const ALBUM_CARD_WIDTH = (width - SPACING.lg * 3) / 2.5;

const LANGUAGE_FILTERS = ['All', 'Hindi', 'Punjabi', 'Tamil', 'Telugu', 'Bengali'];
const TYPE_TABS = [
  { id: 'songs', label: 'Songs', icon: 'music' as const },
  { id: 'albums', label: 'Albums', icon: 'disc' as const },
];


interface ExploreItem {
  id: string;
  type: 'song' | 'album';
  title: string;
  artist: string;
  coverUrl: string;
  streamUrl?: string;
}

export const ExploreScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<'songs' | 'albums'>('songs');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { currentSong } = useAppSelector((state: any) => state.player);
  const colors = useAppSelector((state: any) => state.theme.colors);
  const dispatch = useAppDispatch();


  const flatListRef = useRef<FlatList>(null);

  const fetchItems = useCallback(async (pageNum: number, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
        setPage(1);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      if (activeTab === 'songs') {
        const response = await MusicApiService.getExploreSongs(pageNum, 20, selectedLanguage);
        const newItems: ExploreItem[] = response.items.map((song: Song) => ({

          id: song.id,
          type: 'song' as const,
          title: song.title,
          artist: song.artist,
          coverUrl: song.coverUrl,
          streamUrl: song.audioUrl,
        }));

        if (refresh || pageNum === 1) {
          setItems(newItems);
        } else {
          setItems((prev: ExploreItem[]) => [...prev, ...newItems]);
        }

        setHasMore(response.hasMore);
      } else {
        const response = await MusicApiService.getAlbums(pageNum, 20);
        const newItems: ExploreItem[] = response.items.map((album: Album) => ({

          id: album.id,
          type: 'album' as const,
          title: album.title,
          artist: album.artist,
          coverUrl: album.coverUrl,
        }));

        if (refresh || pageNum === 1) {
          setItems(newItems);
        } else {
          setItems((prev: ExploreItem[]) => [...prev, ...newItems]);
        }

        setHasMore(response.hasMore);
      }

      setPage(pageNum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedLanguage]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
    fetchItems(1, true);
  }, [activeTab, selectedLanguage, fetchItems]);

  const handleRefresh = useCallback(() => {
    fetchItems(1, true);
  }, [fetchItems]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchItems(page + 1);
    }
  }, [loadingMore, hasMore, loading, page, fetchItems]);

  const handleSongPress = useCallback((item: ExploreItem) => {
    const song: Song = {
      id: item.id,
      title: item.title,
      artist: item.artist,
      coverUrl: item.coverUrl,
      audioUrl: item.streamUrl || '',
      duration: 0,
      source: 'gaana',
    };
    dispatch(playSong({ song, queue: items.filter((i: ExploreItem) => i.type === 'song') as any }));
  }, [dispatch, items]);


  const handleAlbumPress = useCallback((item: ExploreItem) => {
    navigation.navigate('AlbumDetail', { albumId: item.id, title: item.title });
  }, [navigation]);

  const handleMiniPlayerPress = () => navigation.navigate('Player');

  const renderSongItem = useCallback(({ item }: { item: ExploreItem }) => (
    <TouchableOpacity
      style={[styles.songCard, { backgroundColor: colors.card }]}
      onPress={() => handleSongPress(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.songImage} />
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.songArtist, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
      </View>
      <TouchableOpacity style={styles.playButton}>
        <Ionicons name="musical-note" size={20} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [colors, handleSongPress]);

  const renderAlbumItem = useCallback(({ item }: { item: ExploreItem }) => (
    <TouchableOpacity
      style={styles.albumCard}
      onPress={() => handleAlbumPress(item)}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.coverUrl }} style={styles.albumImage} />
      <View style={styles.albumOverlay}>
        <Feather name="bookmark" size={20} color="#fff" />
      </View>
      <Text style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
      <Text style={[styles.albumArtist, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
    </TouchableOpacity>

  ), [colors, handleAlbumPress]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Feather name="compass" size={64} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No content found</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Try a different language or check back later
        </Text>
      </View>
    );
  };


  return (
    <SafeContainer style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Explore</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Discover new music</Text>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {TYPE_TABS.map(tab => {
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                {
                  backgroundColor: activeTab === tab.id ? colors.primary : colors.secondary,
                }
              ]}
              onPress={() => setActiveTab(tab.id as 'songs' | 'albums')}
            >
              <Feather name={tab.icon} size={18} color={activeTab === tab.id ? '#000' : colors.text} />
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.id ? '#000' : colors.text }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>


      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {LANGUAGE_FILTERS.map(lang => (
            <CategoryChip
              key={lang}
              label={lang}
              isActive={selectedLanguage === lang}
              onPress={() => setSelectedLanguage(lang)}
            />
          ))}
        </ScrollView>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => fetchItems(1, true)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item: ExploreItem) => `${item.type}-${item.id}`}
          renderItem={activeTab === 'songs' ? renderSongItem : renderAlbumItem}

          numColumns={activeTab === 'songs' ? 1 : 2}
          key={activeTab}
          columnWrapperStyle={activeTab === 'albums' ? styles.columnWrapper : undefined}
          contentContainerStyle={[
            styles.listContent,
            currentSong && styles.listContentWithPlayer,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  filterContainer: {
    paddingVertical: SPACING.md,
  },
  filterScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { marginTop: SPACING.md, fontSize: 14 },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: { fontSize: 16, textAlign: 'center', marginBottom: SPACING.md },
  retryButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  retryText: { color: '#000', fontWeight: '600' },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
  },
  listContentWithPlayer: {
    paddingBottom: 200,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.sm,
  },
  songImage: { width: 60, height: 60, borderRadius: 8 },
  songInfo: { flex: 1, marginLeft: SPACING.md },
  songTitle: { fontSize: 16, fontWeight: '600' },
  songArtist: { fontSize: 14, marginTop: 2 },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumCard: {
    width: ALBUM_CARD_WIDTH,
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: SIZES.radius,
  },
  albumOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumTitle: { fontSize: 14, fontWeight: '600', marginTop: SPACING.sm },
  albumArtist: { fontSize: 12, marginTop: 2 },
  footerLoader: {
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: SPACING.lg },
  emptySubtitle: { fontSize: 14, marginTop: SPACING.sm, textAlign: 'center' },
});

export default ExploreScreen;
