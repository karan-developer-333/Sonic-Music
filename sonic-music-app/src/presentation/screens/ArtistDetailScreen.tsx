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
  ScrollView, 
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import {
  useAppSelector,
  useAppDispatch,
  selectThemeColors,
} from '../../application/store/hooks';
import { MiniPlayer } from '../components/MiniPlayer';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { Song, Album, Artist } from '../../domain/models/MusicModels';
import { MusicApiService, NormalizedArtistResponse } from '../../data/services/MusicApiService';

const { width } = Dimensions.get('window');

const DEBOUNCE_MS = 300;

interface ArtistData {
  artist: NormalizedArtistResponse;
  topSongs: Song[];
  albums: Album[];
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

interface AlbumCardProps {
  album: Album;
  onPress: (albumId: string) => void;
  colors: any;
}

const AlbumCard = memo<AlbumCardProps>(({ album, onPress, colors }) => (
  <TouchableOpacity
    style={[styles.albumCard, { backgroundColor: colors.card }]}
    onPress={() => onPress(album.id)}
    activeOpacity={0.7}
  >
    <Image source={{ uri: album.coverUrl }} style={styles.albumImage} />
    <Text style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1}>
      {album.title}
    </Text>
    <Text style={[styles.albumSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
      {album.songCount ? `${album.songCount} songs` : album.year}
    </Text>
  </TouchableOpacity>
));

AlbumCard.displayName = 'AlbumCard';

function formatFollowers(count?: number): string {
  if (!count) return '';
  if (count >= 10000000) return `${(count / 10000000).toFixed(1)}M followers`;
  if (count >= 100000) return `${(count / 100000).toFixed(1)}L followers`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K followers`;
  return `${count} followers`;
}

import { useQueue } from '../../application/hooks/useQueue';
import { createQueueItem } from '../../domain/models/QueueItem';

export const ArtistDetailScreen = memo(({ route, navigation }: any) => {
  const { artistId } = route.params;
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const colors = useAppSelector(state => selectThemeColors(state)) as any;
  
  // Zustand State
  const { currentSong, playSong: playZustandSong } = useQueue();

  const currentSongId = currentSong?.id;

  useEffect(() => {
    const fetchArtist = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await MusicApiService.getArtistById(artistId);
        setArtistData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load artist');
      } finally {
        setLoading(false);
      }
    };

    fetchArtist();
  }, [artistId]);

  const handlePlayAll = useCallback(() => {
    if (!artistData?.topSongs?.length) return;
    
    const queueItems = artistData.topSongs.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.thumbnail || s.coverUrl,
      audioUrl: s.streamUrl || s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    playZustandSong(queueItems, 0);
  }, [artistData, playZustandSong]);

  const handleShufflePlay = useCallback(() => {
    if (!artistData?.topSongs?.length) return;
    
    const queueItems = artistData.topSongs.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.thumbnail || s.coverUrl,
      audioUrl: s.streamUrl || s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    // Shuffle the queue
    const shuffled = [...queueItems].sort(() => Math.random() - 0.5);
    playZustandSong(shuffled, 0);
  }, [artistData, playZustandSong]);

  const handleSongPress = useCallback((song: Song) => {
    if (!artistData?.topSongs) return;
    
    const queueItems = artistData.topSongs.map(s => createQueueItem({
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
  }, [artistData, playZustandSong]);

  const handleAlbumPress = useCallback((albumId: string) => {
    navigation.navigate('AlbumDetail', { albumId });
  }, [navigation]);

  const handleMiniPlayerPress = useCallback(() => navigation.navigate('Player'), [navigation]);
  const handleGoBack = useCallback(() => navigation.goBack(), [navigation]);

  const renderSongItem = useCallback(({ item, index }: { item: Song; index: number }) => (
    <SongItem
      song={item}
      index={index}
      onPress={handleSongPress}
      colors={colors}
      currentSongId={currentSongId}
    />
  ), [handleSongPress, colors, currentSongId]);

  const renderAlbumItem = useCallback(({ item }: { item: Album }) => (
    <AlbumCard album={item} onPress={handleAlbumPress} colors={colors} />
  ), [handleAlbumPress, colors]);

  const keyExtractor = useCallback((item: Song | Album) => item.id, []);

  const ListHeaderComponent = useMemo(() => (
    <>
      <View style={styles.header}>
        <View style={styles.artistImageContainer}>
          <Image
            source={{ uri: artistData?.artist?.image || artistData?.artist?.thumbnail }}
            style={styles.artistImage}
          />
          {artistData?.artist?.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="checkmark" size={12} color={colors.background} />
            </View>
          )}
        </View>
        <Text style={[styles.artistName, { color: colors.text }]}>
          {artistData?.artist?.name}
        </Text>
        {artistData?.artist?.followerCount && (
          <Text style={[styles.followerCount, { color: colors.textMuted }]}>
            {formatFollowers(artistData.artist.followerCount)}
          </Text>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: colors.primary }]}
          onPress={handlePlayAll}
        >
          <Ionicons name="play" size={24} color={colors.background} />
          <Text style={[styles.playButtonText, { color: colors.background }]}>Play All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shuffleButton, { backgroundColor: colors.secondary }]}
          onPress={handleShufflePlay}
        >
          <Feather name="shuffle" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {artistData?.artist?.bio && (
        <View style={styles.bioSection}>
          <Text style={[styles.bioText, { color: colors.textMuted }]} numberOfLines={3}>
            {artistData.artist.bio}
          </Text>
        </View>
      )}

      {artistData?.topSongs && artistData.topSongs.length > 0 && (
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Songs</Text>
      )}
    </>
  ), [artistData, colors, handlePlayAll, handleShufflePlay]);

  if (loading) {
    return (
      <SafeContainer style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading artist...</Text>
        </View>
      </SafeContainer>
    );
  }

  if (error || !artistData) {
    return (
      <SafeContainer style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            {error || 'Artist not found'}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleGoBack}
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
          {artistData.artist?.name}
        </Text>
        <TouchableOpacity style={styles.shareButton}>
          <Feather name="share-2" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={artistData.topSongs || []}
        renderItem={renderSongItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={
          artistData.albums && artistData.albums.length > 0 ? (
            <View style={styles.albumsSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Albums</Text>
              <FlatList
                data={artistData.albums}
                renderItem={renderAlbumItem}
                keyExtractor={keyExtractor}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.albumsList}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyTracks}>
            <Ionicons name="musical-note" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No songs available
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

    </SafeContainer>
  );
});

ArtistDetailScreen.displayName = 'ArtistDetailScreen';

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
  shareButton: {
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
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  artistImageContainer: {
    position: 'relative',
  },
  artistImage: {
    width: 180,
    height: 180,
    borderRadius: 90,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  followerCount: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
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
  },
  shuffleButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
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
  albumsSection: {
    marginTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  albumsList: {
    paddingHorizontal: SPACING.lg,
  },
  albumCard: {
    width: 140,
    marginRight: SPACING.md,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  albumImage: {
    width: 140,
    height: 140,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '600',
    padding: SPACING.sm,
    paddingBottom: 2,
  },
  albumSubtitle: {
    fontSize: 12,
    paddingHorizontal: SPACING.sm,
    paddingBottom: SPACING.sm,
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

export default ArtistDetailScreen;
