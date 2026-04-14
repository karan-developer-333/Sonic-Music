import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { Song } from '../../domain/models/MusicModels';
import { useAppSelector } from '../../application/store/hooks';
import { SPACING } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';

interface SongListItemProps {
  song: Song;
  onPress: (song: Song) => void;
  onMorePress?: (song: Song) => void;
  showCover?: boolean;
  showDuration?: boolean;
  showActions?: boolean;
  isPlaying?: boolean;
  isCurrentSong?: boolean;
  index?: number;
  showIndex?: boolean;
}

export const SongListItem: React.FC<SongListItemProps> = ({
  song,
  onPress,
  onMorePress,
  showCover = true,
  showDuration = false,
  showActions = true,
  isPlaying = false,
  isCurrentSong = false,
  index,
  showIndex = false,
}) => {
  const colors = useAppSelector(state => state.theme.colors);
  const { isPlaying: playerIsPlaying, currentSong } = useAppSelector(state => state.player);

  const isActive = currentSong?.id === song.id;
  const songIsPlaying = isActive && playerIsPlaying;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handlePress = () => {
    onPress(song);
  };

  const handleMorePress = (e: any) => {
    e.stopPropagation();
    onMorePress?.(song);
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderBottomColor: colors.secondary },
        isActive && styles.activeContainer,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {showIndex && index !== undefined && (
        <View style={styles.indexContainer}>
          <Text style={[styles.index, { color: isActive ? colors.primary : colors.textMuted }]}>
            {index + 1}
          </Text>
        </View>
      )}

      {showCover && (
        <View style={styles.coverContainer}>
          {song.coverUrl ? (
            <Image
              source={{ uri: song.coverUrl }}
              style={[
                styles.cover,
                { backgroundColor: colors.secondary },
                isActive && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: colors.secondary }]}>
              <Feather name="music" size={20} color={colors.textMuted} />
            </View>
          )}
          {isActive && (
            <View style={[styles.playingIndicator, { backgroundColor: colors.primary }]}>
              {songIsPlaying ? (
                <Ionicons name="pause" size={12} color={colors.background} />
              ) : (
                <Ionicons name="play" size={12} color={colors.background} />
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.info}>
        <Text
          style={[
            styles.title,
            { color: isActive ? colors.primary : colors.text },
          ]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>

      {showDuration && song.duration > 0 && (
        <Text style={[styles.duration, { color: colors.textMuted }]}>
          {formatDuration(song.duration)}
        </Text>
      )}

      {showActions && onMorePress && (
        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleMorePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

interface SongListHeaderProps {
  title: string;
  subtitle?: string;
  count?: number;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const SongListHeader: React.FC<SongListHeaderProps> = ({
  title,
  subtitle,
  count,
  action,
}) => {
  const colors = useAppSelector(state => state.theme.colors);

  return (
    <View style={styles.header}>
      <View style={styles.headerInfo}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        )}
        {count !== undefined && (
          <Text style={[styles.headerCount, { color: colors.textMuted }]}>
            {count} {count === 1 ? 'song' : 'songs'}
          </Text>
        )}
      </View>
      {action && (
        <TouchableOpacity onPress={action.onPress}>
          <Text style={[styles.headerAction, { color: colors.primary }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
  },
  activeContainer: {
    backgroundColor: 'rgba(163, 255, 18, 0.05)',
  },
  indexContainer: {
    width: 30,
    alignItems: 'center',
  },
  index: {
    fontSize: 14,
    fontWeight: '500',
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  coverPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playingIndicator: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  artist: {
    fontSize: 14,
    marginTop: 2,
  },
  duration: {
    fontSize: 12,
    marginRight: SPACING.md,
  },
  moreButton: {
    padding: SPACING.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerCount: {
    fontSize: 12,
    marginTop: 4,
  },
  headerAction: {
    fontSize: 14,
    fontWeight: '600',
  },
});
