/**
 * UpNextModal Component - Presentation Layer
 * Bottom sheet modal for managing the playback queue
 * Uses @gorhom/bottom-sheet for smooth animations
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import BottomSheet, {
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { QueueList } from './QueueList';
import { QueueItem } from '../../domain/models/QueueItem';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { SPACING, SIZES } from '../theme/theme';
import { useQueueStore, RepeatMode } from '../../application/store/queueStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SNAP_POINTS = ['50%', '75%', '90%'];

// ============================================
// TYPES
// ============================================

interface UpNextModalProps {
  visible: boolean;
  onClose: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    textMuted: string;
    primary: string;
    danger: string;
    glass: string;
    secondary: string;
  };
}

interface NowPlayingCardProps {
  song: QueueItem | null;
  isPlaying: boolean;
  colors: UpNextModalProps['colors'];
}

interface QueueHeaderProps {
  upNextCount: number;
  onClear: () => void;
  colors: UpNextModalProps['colors'];
}

interface PlaybackControlsProps {
  repeat: RepeatMode;
  shuffle: boolean;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  colors: UpNextModalProps['colors'];
}

// ============================================
// SUB-COMPONENTS
// ============================================

const NowPlayingCard: React.FC<NowPlayingCardProps> = ({ song, isPlaying, colors }) => {
  if (!song) return null;

  return (
    <View style={[styles.nowPlayingContainer, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.nowPlayingLabel, { color: colors.primary }]}>
        NOW PLAYING
      </Text>
      <View style={styles.nowPlayingRow}>
        {song.thumbnail ? (
          <Image source={{ uri: song.thumbnail }} style={styles.nowPlayingCover} />
        ) : (
          <View style={[styles.nowPlayingCover, { backgroundColor: colors.glass }]}>
            <Feather name="music" size={20} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.nowPlayingInfo}>
          <Text style={[styles.nowPlayingTitle, { color: colors.text }]} numberOfLines={1}>
            {song.title}
          </Text>
          <Text style={[styles.nowPlayingArtist, { color: colors.textMuted }]} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
        {isPlaying && (
          <View style={[styles.playingIndicator, { backgroundColor: colors.primary }]}>
            <Ionicons name="volume-high" size={16} color="#000" />
          </View>
        )}
      </View>
    </View>
  );
};

const QueueHeader: React.FC<QueueHeaderProps> = ({ upNextCount, onClear, colors }) => {
  return (
    <View style={styles.queueHeader}>
      <View style={styles.queueCount}>
        <Ionicons name="list" size={18} color={colors.textMuted} />
        <Text style={[styles.queueCountText, { color: colors.textMuted }]}>
          {upNextCount} {upNextCount === 1 ? 'song' : 'songs'} up next
        </Text>
      </View>
      {upNextCount > 0 && (
        <TouchableOpacity style={styles.clearButton} onPress={onClear}>
          <Text style={[styles.clearText, { color: colors.danger }]}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  repeat,
  shuffle,
  onToggleRepeat,
  onToggleShuffle,
  colors,
}) => {
  const repeatIcon = useMemo(() => {
    switch (repeat) {
      case 'one': return 'repeat-once';
      case 'all': return 'repeat';
      default: return 'repeat-outline';
    }
  }, [repeat]);

  return (
    <View style={styles.controlsContainer}>
      <TouchableOpacity
        style={[
          styles.controlButton,
          shuffle && { backgroundColor: colors.primary + '20' },
        ]}
        onPress={onToggleShuffle}
      >
        <Ionicons
          name="shuffle"
          size={20}
          color={shuffle ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.controlButton,
          repeat !== 'none' && { backgroundColor: colors.primary + '20' },
        ]}
        onPress={onToggleRepeat}
      >
        <Ionicons
          name={repeatIcon as any}
          size={20}
          color={repeat !== 'none' ? colors.primary : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const UpNextModal: React.FC<UpNextModalProps> = ({
  visible,
  onClose,
  colors,
}) => {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    if (visible && bottomSheetRef.current) {
      bottomSheetRef.current.expand();
    }
  }, [visible]);
 
  const currentSong = useQueueStore(state => state.currentSong);
  const queue = useQueueStore(state => state.queue);
  const isPlaying = useQueueStore(state => state.isPlaying);
  const repeat = useQueueStore(state => state.repeat);
  const shuffle = useQueueStore(state => state.shuffle);
  const upNextCount = queue.length;

  const handleClear = useCallback(() => {
    useQueueStore.getState().clearQueue();
  }, []);

  const handleSongPress = useCallback((song: QueueItem) => {
    useQueueStore.getState().playSong(song);
  }, []);

  const handleRemove = useCallback((id: string) => {
    useQueueStore.getState().removeFromQueue(id);
  }, []);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    useQueueStore.getState().reorderQueue(fromIndex, toIndex);
  }, []);

  const handleToggleRepeat = useCallback(() => {
    useQueueStore.getState().toggleRepeat();
  }, []);

  const handleToggleShuffle = useCallback(() => {
    useQueueStore.getState().toggleShuffle();
  }, []);

  // Render backdrop
  const renderBackdrop = useCallback(
    () => (
      <TouchableOpacity
        style={styles.backdropOverlay}
        onPress={onClose}
        activeOpacity={1}
      />
    ),
    [onClose]
  );

  // Memoized styles
  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        backgroundColor: colors.card,
        paddingBottom: insets.bottom,
      },
    ],
    [colors.card, insets.bottom]
  );

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.backdropOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <BottomSheet
          ref={bottomSheetRef as any}
          index={0}
          snapPoints={SNAP_POINTS}
          onClose={onClose}
          enablePanDownToClose
          handleIndicatorStyle={[styles.handle, { backgroundColor: colors.textMuted }]}
          backgroundStyle={{ backgroundColor: colors.card }}
        >
        <BottomSheetView style={containerStyle}>
          <View style={[styles.header, { borderBottomColor: colors.secondary }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="list" size={24} color={colors.text} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Up Next
              </Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <NowPlayingCard song={currentSong} isPlaying={isPlaying} colors={colors} />

          <PlaybackControls
            repeat={repeat}
            shuffle={shuffle}
            onToggleRepeat={handleToggleRepeat}
            onToggleShuffle={handleToggleShuffle}
            colors={colors}
          />

          <QueueHeader upNextCount={upNextCount} onClear={handleClear} colors={colors} />

          <View style={styles.queueListContainer}>
            <QueueList
              songs={queue}
              currentSong={currentSong}
              colors={colors}
              onSongPress={handleSongPress}
              onRemove={handleRemove}
              onReorder={handleReorder}
            />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </GestureHandlerRootView>
    </Modal>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    flex: 1,
    borderTopLeftRadius: SIZES.radius,
    borderTopRightRadius: SIZES.radius,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginTop: SPACING.sm,
    alignSelf: 'center',
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
  closeButton: {
    padding: SPACING.xs,
  },
  nowPlayingContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: 12,
  },
  nowPlayingLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },
  nowPlayingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowPlayingCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  nowPlayingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  nowPlayingArtist: {
    fontSize: 14,
    marginTop: 2,
  },
  playingIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: SPACING.md,
  },
  controlButton: {
    padding: SPACING.sm,
    borderRadius: 20,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  queueCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  queueCountText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  queueListContainer: {
    flex: 1,
  },
});

export default UpNextModal;
