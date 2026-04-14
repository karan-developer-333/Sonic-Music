import React, { useCallback, memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playNext, togglePlayback } from '../../application/store/slices/playerSlice';
import { Play, Pause, SkipForward, Music2 } from 'lucide-react-native';

interface MiniPlayerProps {
  onPress: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = memo(({ onPress }) => {
  const insets = useSafeAreaInsets();
  const { currentSong, isPlaying, progress } = useAppSelector(state => state.player);
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();

  const bottomOffset = SIZES.tabBarHeight + insets.bottom + SPACING.md;

  const handleTogglePlayPause = useCallback((e: any) => {
    e.stopPropagation();
    dispatch(togglePlayback());
  }, [dispatch]);

  const handlePlayNext = useCallback((e: any) => {
    e.stopPropagation();
    dispatch(playNext());
  }, [dispatch]);

  if (!currentSong) return null;

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: colors.card,
          bottom: bottomOffset,
        }
      ]} 
      onPress={onPress} 
      activeOpacity={0.9}
    >
      <View style={[styles.progressBar, { backgroundColor: colors.secondary }]}>
        <View
          style={[
            styles.progress, 
            { backgroundColor: colors.primary, width: `${progress * 100}%` }
          ]} 
        />
      </View>
      
      <View style={styles.content}>
        {currentSong.coverUrl ? (
          <Image 
            source={{ uri: currentSong.coverUrl }} 
            style={[styles.cover, { backgroundColor: colors.secondary }]} 
          />
        ) : (
          <View style={[styles.cover, { backgroundColor: colors.secondary }]}>
            <Music2 size={24} color={colors.textMuted} />
          </View>
        )}
        
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {currentSong.title || 'Unknown'}
          </Text>
          <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
            {currentSong.artist || 'Unknown Artist'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleTogglePlayPause}
          >
            {isPlaying ? (
              <Pause size={24} color={colors.text} fill={colors.text} />
            ) : (
              <Play size={24} color={colors.text} fill={colors.text} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayNext}
          >
            <SkipForward size={24} color={colors.text} fill={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
});

MiniPlayer.displayName = 'MiniPlayer';

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    marginBottom: 5,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  progressBar: {
    height: 3,
  },
  progress: {
    height: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
  },
  cover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  controlButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});