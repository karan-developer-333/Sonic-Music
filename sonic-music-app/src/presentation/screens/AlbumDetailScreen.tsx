import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  FlatList,
  ActivityIndicator, 
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch, selectThemeColors } from '../../application/store/hooks';
import { MiniPlayer } from '../components/MiniPlayer';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { Song, Album } from '../../domain/models/MusicModels';
import { MusicApiService } from '../../data/services/MusicApiService';

const { width } = Dimensions.get('window');

const DEBOUNCE_MS = 300;

function useDebounce(callback: () => void, delay: number) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = React.useRef(callback);
  
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

interface SongItemProps {
  song: Song;
  index: number;
  onPress: (song: Song) => void;
  colors: any;
  currentSongId?: string;
}

const SongItem = memo<SongItemProps>(({ song, index, onPress, colors, currentSongId }) => {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isCurrentSong = currentSongId === song.id;

  return (
    <TouchableOpacity
      style={[styles.songItem, isCurrentSong && { backgroundColor: colors.secondary }]}
      onPress={() => onPress(song)}
      activeOpacity={0.7}
    >
      <Text style={[styles.songIndex, { color: colors.textMuted }]}>{index + 1}</Text>
      <Image source={{ uri: song.coverUrl }} style={styles.songImage} />
      <View style={styles.songInfo}>
        <Text 
          style={[styles.songTitle, { color: isCurrentSong ? colors.primary : colors.text }]} 
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={[styles.songArtist, { color: colors.textMuted }]} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      <Text style={[styles.songDuration, { color: colors.textMuted }]}>
        {formatDuration(song.duration)}
      </Text>
    </TouchableOpacity>
  );
});

SongItem.displayName = 'SongItem';

import { useQueue } from '../../application/hooks/useQueue';
import { createQueueItem } from '../../domain/models/QueueItem';

export const AlbumDetailScreen = memo(({ route, navigation }: any) => {
  const { albumId } = route.params;
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const colors = useAppSelector(state => selectThemeColors(state)) as any;
  
  // Zustand State
  const { currentSong, playSong: playZustandSong } = useQueue();

  const currentSongId = currentSong?.id;

  useEffect(() => {
    const fetchAlbum = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await MusicApiService.getAlbumById(albumId);
        setAlbum(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load album');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbum();
  }, [albumId]);

  const handlePlayAll = useCallback(() => {
    if (!album?.tracks?.length) return;
    
    const queueItems = album.tracks.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.coverUrl,
      audioUrl: s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    playZustandSong(queueItems, 0);
  }, [album, playZustandSong]);

  const handleShufflePlay = useCallback(() => {
    if (!album?.tracks?.length) return;
    
    const queueItems = album.tracks.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.coverUrl,
      audioUrl: s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    // Shuffle the queue
    const shuffled = [...queueItems].sort(() => Math.random() - 0.5);
    playZustandSong(shuffled, 0);
  }, [album, playZustandSong]);

  const handleSongPress = useCallback((song: Song) => {
    if (!album?.tracks) return;
    
    const queueItems = album.tracks.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.coverUrl,
      audioUrl: s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    const startIndex = queueItems.findIndex(item => item.id === song.id);
    playZustandSong(queueItems, startIndex >= 0 ? startIndex : 0);
  }, [album, playZustandSong]);

  const handleMiniPlayerPress = () => navigation.navigate('Player');
  const handleGoBack = () => navigation.goBack();

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const totalDuration = useMemo(() => 
    album?.tracks?.reduce((acc, t) => acc + (t.duration || 0), 0) || 0,
    [album?.tracks]
  );

  const renderSongItem = useCallback(({ item, index }: { item: Song; index: number }) => (
    <SongItem
      song={item}
      index={index}
      onPress={handleSongPress}
      colors={colors}
      currentSongId={currentSongId}
    />
  ), [handleSongPress, colors, currentSongId]);

  const keyExtractor = useCallback((item: Song) => item.id, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 70,
    offset: 70 * index,
    index,
  }), []);

  if (loading) {
    return (
      <SafeContainer style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading album...</Text>
        </View>
      </SafeContainer>
    );
  }

  if (error || !album) {
    return (
      <SafeContainer style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || 'Album not found'}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeContainer>
    );
  }

  return (
    <SafeContainer style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {album.title}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setIsSaved(!isSaved)}
          >
            <Ionicons 
              name="heart" 
              size={22} 
              color={isSaved ? colors.primary : colors.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="share-2" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={album.tracks || []}
        renderItem={renderSongItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={
          <>
            <View style={styles.albumHeader}>
              <Image 
                source={{ uri: album.coverUrl || album.artwork }} 
                style={styles.albumCover}
              />
              <View style={styles.albumInfo}>
                <Text style={[styles.albumTitle, { color: colors.text }]}>{album.title}</Text>
                <Text style={[styles.albumArtist, { color: colors.textMuted }]}>{album.artist}</Text>
                <View style={styles.albumMeta}>
                  {album.genre && (
                    <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.badgeText, { color: colors.text }]}>{album.genre}</Text>
                    </View>
                  )}
                  {album.songCount && (
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {album.songCount} songs
                    </Text>
                  )}
                  {totalDuration > 0 && (
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      {Math.floor(totalDuration / 60000)} min
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.playButton, { backgroundColor: colors.primary }]}
                onPress={handlePlayAll}
              >
                <Ionicons name="play" size={24} color="#000" />
                <Text style={styles.playButtonText}>Play All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shuffleButton, { backgroundColor: colors.secondary }]}
                onPress={handleShufflePlay}
              >
                <Feather name="shuffle" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyTracks}>
            <Ionicons name="musical-note" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No tracks available
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />

    </SafeContainer>
  );
});

AlbumDetailScreen.displayName = 'AlbumDetailScreen';

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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
  albumHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  albumCover: {
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: SIZES.radius,
  },
  albumInfo: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  albumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  albumArtist: {
    fontSize: 16,
    marginTop: SPACING.xs,
  },
  albumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  badgeText: { fontSize: 12, fontWeight: '500' },
  metaText: { fontSize: 14 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 25,
    gap: SPACING.sm,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  shuffleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackList: {
    paddingHorizontal: SPACING.lg,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  songIndex: {
    width: 30,
    fontSize: 14,
    textAlign: 'center',
  },
  songImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: SPACING.sm,
  },
  songInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: 14,
    marginTop: 2,
  },
  songDuration: {
    fontSize: 14,
  },
  emptyTracks: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
  },
});

export default AlbumDetailScreen;
