/**
 * QueueList Component - Presentation Layer
 * Draggable list of queue items with swipe to remove
 * Uses react-native-draggable-flatlist for smooth animations
 */

import React, { useCallback, memo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import Animated, { SharedValue } from 'react-native-reanimated';
import SwipeableItem, {
  UnderlayParams,
  OpenDirection,
} from 'react-native-swipeable-item';
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueueItem } from '../../domain/models/QueueItem';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { SPACING, SIZES } from '../theme/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================

interface QueueListProps {
  songs: QueueItem[];
  currentSong: QueueItem | null;
  colors: {
    card: string;
    text: string;
    textMuted: string;
    primary: string;
    danger: string;
    glass: string;
    secondary: string;
  };
  onSongPress: (song: QueueItem) => void;
  onRemove: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface QueueItemProps {
  item: QueueItem;
  index: number;
  drag: () => void;
  isActive: boolean;
  colors: QueueListProps['colors'];
  onPress: (song: QueueItem) => void;
  onRemove: (id: string) => void;
}

// ============================================
// MEMOIZED COMPONENTS
// ============================================

const QueueItemCard = memo(function QueueItemCard({
  item,
  drag,
  isActive,
  colors,
  onPress,
  onRemove,
}: QueueItemProps) {
  const handlePress = useCallback(() => {
    onPress(item);
  }, [item, onPress]);

  const handleLongPress = useCallback(() => {
    drag();
  }, [drag]);

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <ScaleDecorator activeScale={1.02}>
      <TouchableOpacity
        style={[
          styles.queueItem,
          { backgroundColor: colors.card },
          isActive && styles.activeItem,
          isActive && { borderColor: colors.primary },
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        delayLongPress={200}
        activeOpacity={0.7}
      >
        {/* Drag Handle */}
        <View style={styles.dragHandle}>
          <Ionicons name="menu" size={20} color={colors.textMuted} />
        </View>

        {/* Thumbnail */}
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, { backgroundColor: colors.glass }]} >
            <Feather name="music" size={20} color={colors.textMuted} />
          </View>
        )}

        {/* Song Info */}
        <View style={styles.songInfo}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          <Text
            style={[styles.artist, { color: colors.textMuted }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.artist}
          </Text>
        </View>

        {/* Duration */}
        {item.duration != null && item.duration > 0 && (
          <Text style={[styles.duration, { color: colors.textMuted }]} >
            {formatDuration(item.duration)}
          </Text>
        )}

        {/* Remove Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => onRemove(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </ScaleDecorator>
  );
});

// Swipeable item wrapper
const SwipeableQueueItem = memo(function SwipeableQueueItem({
  item,
  index,
  drag,
  isActive,
  colors,
  onPress,
  onRemove,
}: QueueItemProps) {
  const renderUnderlayLeft = useCallback(() => (
    <Animated.View
      style={[
        styles.underlay,
        { backgroundColor: colors.danger },
      ]}
    >
      <Ionicons name="trash-outline" size={24} color="white" />
      <Text style={styles.underlayText}>Remove</Text>
    </Animated.View>
  ), [colors.danger]);

  const handleSwipeLeft = useCallback(() => {
    onRemove(item.id);
  }, [item.id, onRemove]);

  const SwipeableItemAny = SwipeableItem as any;

  return (
    <SwipeableItemAny
      item={item}
      renderUnderlayLeft={renderUnderlayLeft}
      onChange={({ openDirection }: any) => {
        if (openDirection === OpenDirection.LEFT) {
          onRemove(item.id);
        }
      }}
      snapPointsLeft={[80]}
      style={styles.swipeableItem}
    >
      <QueueItemCard
        item={item}
        index={index}
        drag={drag}
        isActive={isActive}
        colors={colors}
        onPress={onPress}
        onRemove={onRemove}
      />
    </SwipeableItemAny>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export const QueueList: React.FC<QueueListProps> = ({
  songs,
  currentSong,
  colors,
  onSongPress,
  onRemove,
  onReorder,
}) => {
  // Handle item press
  const handleItemPress = useCallback((item: QueueItem) => {
    onSongPress(item);
  }, [onSongPress]);

  // Handle item remove
  const handleItemRemove = useCallback((id: string) => {
    Alert.alert(
      'Remove from Queue',
      'Are you sure you want to remove this song?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => onRemove(id),
        },
      ]
    );
  }, [onRemove]);

  // Handle reorder
  const handleReorder = useCallback((data: QueueItem[], fromIndex: number, toIndex: number) => {
    onReorder(fromIndex, toIndex);
  }, [onReorder]);

  // Render item
  const renderItem = useCallback(
    ({ item, drag, isActive, getIndex }: RenderItemParams<QueueItem>) => {
      const index = getIndex() ?? 0;
      return (
        <SwipeableQueueItem
          item={item}
          index={index}
          drag={drag}
          isActive={isActive}
          colors={colors}
          onPress={handleItemPress}
          onRemove={handleItemRemove}
        />
      );
    },
    [colors, handleItemPress, handleItemRemove]
  );

  // Key extractor
  const keyExtractor = useCallback((item: QueueItem) => item.id, []);

  // Empty state
  const renderEmpty = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Ionicons name="musical-notes" size={48} color={colors.textMuted} />
      <Text style={[styles.emptyText, { color: colors.textMuted }]} >
        Queue is empty
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textMuted }]} >
        Add songs to start playing
      </Text>
    </View>
  ), [colors.textMuted]);

  if (songs.length === 0) {
    return renderEmpty();
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <DraggableFlatList<QueueItem>
        data={songs}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onDragEnd={({ data, from, to }) => handleReorder(data, from, to)}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        autoscrollThreshold={50}
        autoscrollSpeed={200}
        activationDistance={100}
      />
    </GestureHandlerRootView>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  swipeableItem: {
    marginBottom: SPACING.xs,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    marginHorizontal: SPACING.md,
  },
  activeItem: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  dragHandle: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.xs,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  songInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    fontSize: 12,
  },
  duration: {
    fontSize: 12,
    marginLeft: SPACING.sm,
    minWidth: 40,
    textAlign: 'right',
  },
  removeButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.sm,
  },
  underlay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: SPACING.lg,
    borderRadius: 12,
    marginHorizontal: SPACING.md,
  },
  underlayText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: SPACING.xs,
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
});

export default QueueList;