import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playSong } from '../../application/store/slices/playerSlice';
import { MiniPlayer } from '../components/MiniPlayer';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { Song, Album } from '../../domain/models/MusicModels';
import { MusicApiService } from '../../data/services/MusicApiService';

const { width } = Dimensions.get('window');

export const AlbumDetailScreen = ({ route, navigation }: any) => {
  const { albumId } = route.params;
  const [album, setAlbum] = useState<Album | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  const { currentSong } = useAppSelector(state => state.player);
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();

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
    dispatch(playSong({ song: album.tracks[0], queue: album.tracks }));
  }, [album, dispatch]);

  const handleShufflePlay = useCallback(() => {
    if (!album?.tracks?.length) return;
    const shuffled = [...album.tracks].sort(() => Math.random() - 0.5);
    dispatch(playSong({ song: shuffled[0], queue: shuffled }));
  }, [album, dispatch]);

  const handleSongPress = useCallback((song: Song) => {
    if (!album?.tracks) return;
    dispatch(playSong({ song, queue: album.tracks }));
  }, [album, dispatch]);

  const handleMiniPlayerPress = () => navigation.navigate('Player');
  const handleGoBack = () => navigation.goBack();

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderSongItem = ({ item, index }: { item: Song; index: number }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => handleSongPress(item)}
      activeOpacity={0.7}
    >
      <Text style={[styles.songIndex, { color: colors.textMuted }]}>{index + 1}</Text>
      <Image source={{ uri: item.coverUrl }} style={styles.songImage} />
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.songArtist, { color: colors.textMuted }]} numberOfLines={1}>
          {item.artist}
        </Text>
      </View>
      <Text style={[styles.songDuration, { color: colors.textMuted }]}>
        {formatDuration(item.duration)}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeContainer style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={48} color={colors.primary} />
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

  const totalDuration = album.tracks?.reduce((acc, t) => acc + (t.duration || 0), 0) || 0;

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

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          currentSong && styles.scrollContentWithPlayer
        ]}
      >
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

        {album.tracks && album.tracks.length > 0 ? (
          <View style={styles.trackList}>
            {album.tracks.map((song, index) => (
              <View key={song.id}>
                {renderSongItem({ item: song, index })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyTracks}>
            <Ionicons name="musical-note" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No tracks available
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
    </SafeContainer>
  );
};

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
  scrollContent: { paddingBottom: 20 },
  scrollContentWithPlayer: { paddingBottom: 180 },
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
