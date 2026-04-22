import React, { useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView, 
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { useQueue } from '../../application/hooks/useQueue';
import { createQueueItem } from '../../domain/models/QueueItem';
import { SongListItem } from '../components/SongListItem';
import { MiniPlayer } from '../components/MiniPlayer';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';

export const PlaylistDetailScreen = ({ route, navigation }: any) => {
  const { playlistId } = route.params;
  const playlists = useAppSelector(state => state.playlist.playlists);
  const playlist = playlists.find(p => p.id === playlistId);

  // Zustand State
  const { 
    currentSong, 
    shuffle, 
    playSong: playZustandSong, 
    toggleShuffle: toggleZustandShuffle 
  } = useQueue();
  
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();

  const isLikedPlaylist = playlistId === 'liked';
  const isFavoritesPlaylist = playlistId === 'favorites';

  const handlePlaySong = useCallback((song: any) => {
    if (playlist?.songs) {
      const queueItems = playlist.songs.map(s => createQueueItem({
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
    }
  }, [playlist?.songs, playZustandSong]);

  const handlePlayAll = useCallback(() => {
    if (playlist?.songs && playlist.songs.length > 0) {
      if (shuffle) {
        toggleZustandShuffle();
      }
      
      const queueItems = playlist.songs.map(s => createQueueItem({
        id: s.id,
        title: s.title,
        artist: s.artist,
        coverUrl: s.thumbnail || s.coverUrl,
        audioUrl: s.streamUrl || s.audioUrl,
        duration: s.duration,
        source: s.source,
      }));
      
      playZustandSong(queueItems, 0);
    }
  }, [playlist?.songs, shuffle, toggleZustandShuffle, playZustandSong]);

  const handleShufflePlay = useCallback(() => {
    if (playlist?.songs && playlist.songs.length > 0) {
      if (!shuffle) {
        toggleZustandShuffle();
      }
      const queueItems = playlist.songs.map(s => createQueueItem({
        id: s.id,
        title: s.title,
        artist: s.artist,
        coverUrl: s.thumbnail || s.coverUrl,
        audioUrl: s.streamUrl || s.audioUrl,
        duration: s.duration,
        source: s.source,
      }));
      
      const shuffled = [...queueItems].sort(() => Math.random() - 0.5);
      playZustandSong(shuffled, 0);
    }
  }, [playlist?.songs, shuffle, toggleZustandShuffle, playZustandSong]);

  const handleMiniPlayerPress = () => {
    navigation.navigate('Player');
  };

  const renderSongItem = ({ item, index }: { item: any; index: number }) => (
    <SongListItem
      song={item}
      onPress={handlePlaySong}
      showCover={true}
      showDuration={true}
      showActions={!isLikedPlaylist}
      isCurrentSong={currentSong?.id === item.id}
      index={index}
      showIndex={true}
    />
  );

  if (!playlist) {
    return (
      <SafeContainer style={styles.container}>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.text }]}>
            Playlist not found
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: colors.background }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeContainer>
    );
  }

  const playlistCover = isLikedPlaylist
    ? 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1000&auto=format&fit=crop'
    : isFavoritesPlaylist
      ? 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop'
      : playlist.coverUrl || 'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000&auto=format&fit=crop';

  return (
    <SafeContainer style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          currentSong && styles.scrollContentWithPlayer
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerButton}>
              <Feather name="share" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.playlistInfo}>
          <Image source={{ uri: playlistCover }} style={styles.playlistCover} />
          <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={2}>
            {playlist.name}
          </Text>
          <Text style={[styles.playlistCount, { color: colors.textMuted }]}>
            {playlist.songs.length} {playlist.songs.length === 1 ? 'song' : 'songs'}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity 
            style={[styles.playButton, { backgroundColor: colors.primary }]}
            onPress={handlePlayAll}
            disabled={playlist.songs.length === 0}
          >
            <Ionicons name="play" size={20} color={colors.background} />
            <Text style={[styles.playButtonText, { color: colors.background }]}>Play</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shuffleButton, { borderColor: colors.secondary }]}
            onPress={handleShufflePlay}
            disabled={playlist.songs.length === 0}
          >
            <Feather name="shuffle" size={18} color={colors.text} />
            <Text style={[styles.shuffleButtonText, { color: colors.text }]}>Shuffle</Text>
          </TouchableOpacity>
        </View>

        {playlist.songs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="musical-note" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No songs yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {isLikedPlaylist
                ? 'Tap the heart icon on songs to add them here'
                : 'Songs you add to this playlist will appear here'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={playlist.songs}
            keyExtractor={(item: any) => item.id}
            renderItem={renderSongItem}
            scrollEnabled={false}
            contentContainerStyle={styles.songsList}
          />
        )} 

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentWithPlayer: {
    paddingBottom: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerBack: {
    padding: SPACING.xs,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: SPACING.sm,
  },
  playlistInfo: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
  },
  playlistCover: {
    width: 200,
    height: 200,
    borderRadius: SIZES.radius,
  },
  playlistName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
  playlistCount: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
    gap: SPACING.sm,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  shuffleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  songsList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: SPACING.lg,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: SPACING.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notFoundText: {
    fontSize: 18,
    marginBottom: SPACING.lg,
  },
  backButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PlaylistDetailScreen;
