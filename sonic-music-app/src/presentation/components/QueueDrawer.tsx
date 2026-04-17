import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DraxProvider, DraxList } from 'react-native-drax';
import { Song } from '../../domain/models/MusicModels';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { selectThemeColors } from '../../application/store/hooks';
import { reorderQueue, removeFromQueue, clearQueue, setQueueDrawerOpen, playSong } from '../../application/store/slices/playerSlice';
import { SPACING, SIZES } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface QueueDrawerProps {
  visible: boolean;
  onClose: () => void;
}

interface QueueItemData {
  song: Song;
  index: number;
}

export const QueueDrawer: React.FC<QueueDrawerProps> = ({ visible, onClose }) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const colors = useAppSelector(selectThemeColors);

  const currentSong = useAppSelector((state) => state.player.currentSong);
  const queue = useAppSelector((state) => state.player.queue);

  const currentIndex = queue.findIndex((s) => s.id === currentSong?.id);
  const upcomingSongs = queue.slice(currentIndex + 1).map((song, idx) => ({
    song,
    index: idx,
  }));

  const handleSongPress = useCallback((song: Song) => {
    dispatch(playSong({ song, queue }));
  }, [dispatch, queue]);

  const handleRemoveFromQueue = useCallback((queueIndex: number) => {
    const actualIndex = queueIndex + currentIndex + 1;
    dispatch(removeFromQueue(actualIndex));
  }, [dispatch, currentIndex]);

  const handleClearQueue = useCallback(() => {
    dispatch(clearQueue());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    dispatch(setQueueDrawerOpen(false));
    onClose();
  }, [dispatch, onClose]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleReorder = useCallback((event: any) => {
    const { fromIndex, toIndex } = event;
    const actualFromIndex = fromIndex + currentIndex + 1;
    const actualToIndex = toIndex + currentIndex + 1;
    dispatch(reorderQueue({
      fromIndex: actualFromIndex,
      toIndex: actualToIndex,
    }));
  }, [dispatch, currentIndex]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderItem = useCallback(({ item }: any) => (
    <View style={[styles.queueItem, { backgroundColor: colors.card }]}>
      <View style={styles.indexContainer}>
        <Ionicons name="menu" size={16} color={colors.textMuted} />
      </View>

      <TouchableOpacity style={styles.queueItemContent} onPress={() => handleSongPress(item.song)}>
        {item.song.coverUrl ? (
          <Image source={{ uri: item.song.coverUrl }} style={styles.queueCover} />
        ) : (
          <View style={[styles.queueCover, { backgroundColor: colors.glass }]}>
            <Feather name="music" size={16} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.queueItemInfo}>
          <Text style={[styles.queueItemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.song.title}
          </Text>
          <Text style={[styles.queueItemArtist, { color: colors.textMuted }]} numberOfLines={1}>
            {item.song.artist}
          </Text>
        </View>
        {item.song.duration > 0 && (
          <Text style={[styles.queueItemDuration, { color: colors.textMuted }]}>
            {formatDuration(item.song.duration)}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFromQueue(item.index)}>
        <Ionicons name="close-circle" size={22} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  ), [colors, handleSongPress, handleRemoveFromQueue]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const keyExtractor = useCallback((item: any) => item.song.id, []);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />
      <GestureHandlerRootView style={styles.gestureRoot}>
        <View style={[
          styles.container,
          {
            backgroundColor: colors.card,
            paddingBottom: insets.bottom,
          }
        ]}>
          <View style={[styles.header, { borderBottomColor: colors.secondary }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="list" size={24} color={colors.text} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>Up Next</Text>
            </View>
            <View style={styles.headerRight}>
              {upcomingSongs.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={handleClearQueue}>
                  <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {currentSong && (
            <View style={[styles.currentSongContainer, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.nowPlayingLabel, { color: colors.primary }]}>NOW PLAYING</Text>
              <View style={styles.currentSongRow}>
                {currentSong.coverUrl ? (
                  <Image source={{ uri: currentSong.coverUrl }} style={styles.currentCover} />
                ) : (
                  <View style={[styles.currentCover, { backgroundColor: colors.glass }]}>
                    <Feather name="music" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.currentSongInfo}>
                  <Text style={[styles.currentSongTitle, { color: colors.text }]} numberOfLines={1}>
                    {currentSong.title}
                  </Text>
                  <Text style={[styles.currentSongArtist, { color: colors.textMuted }]} numberOfLines={1}>
                    {currentSong.artist}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.queueContainer}>
            <Text style={[styles.queueLabel, { color: colors.textMuted }]}>
              {upcomingSongs.length} {upcomingSongs.length === 1 ? 'song' : 'songs'} in queue
            </Text>

            {upcomingSongs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Queue is empty</Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                  Add songs to start playing
                </Text>
              </View>
            ) : (
              <DraxProvider>
                <DraxList<QueueItemData>
                  data={upcomingSongs}
                  keyExtractor={keyExtractor}
                  onReorder={handleReorder}
                  renderItemContent={renderItem}
                  renderItem={renderItem}
                  lockToMainAxis
                  animationConfig="spring"
                  style={styles.draxList}
                />
              </DraxProvider>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  gestureRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderTopLeftRadius: SIZES.radius,
    borderTopRightRadius: SIZES.radius,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  currentSongContainer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  nowPlayingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  currentSongRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentSongInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  currentSongTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  currentSongArtist: {
    fontSize: 14,
    marginTop: 2,
  },
  queueContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  queueLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
  draxList: {
    flex: 1,
  },
  indexContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.xs,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.xs,
    marginBottom: SPACING.xs,
    borderRadius: 12,
  },
  queueItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  queueCover: {
    width: 40,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueItemInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  queueItemTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  queueItemArtist: {
    fontSize: 12,
    marginTop: 2,
  },
  queueItemDuration: {
    fontSize: 12,
    marginLeft: SPACING.sm,
  },
  removeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
});
