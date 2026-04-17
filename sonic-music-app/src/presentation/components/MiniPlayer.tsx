import React, { useCallback, memo, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACING, SIZES } from '../theme/theme';
import {
  useAppSelector,
  useAppDispatch,
  selectCurrentSong,
  selectIsPlaying,
  selectThemeColors,
} from '../../application/store/hooks';
import { skipNext, togglePlayback } from '../../application/store/slices/playerSlice';
import { PlaybackService } from '../../application/services/PlaybackService';
import { Ionicons } from '@expo/vector-icons';

const DEBOUNCE_MS = 300;

function useDebounce(callback: () => void, delay: number) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  
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

interface MiniPlayerProps {
  onPress: () => void;
  onQueuePress?: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = memo(({ onPress, onQueuePress }) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  
  const currentSong = useAppSelector(selectCurrentSong);
  const isPlaying = useAppSelector(selectIsPlaying);
  const colors = useAppSelector(selectThemeColors);
  const [localProgress, setLocalProgress] = useState(0);

  const bottomOffset = SIZES.tabBarHeight + insets.bottom + SPACING.md;

  useEffect(() => {
    const playbackService = PlaybackService.getInstance();
    
    const callbackId = playbackService.setStatusCallback((status) => {
      if (status.isLoaded) {
        const progress = status.positionMillis / (status.durationMillis || 1);
        setLocalProgress(progress);
      }
    });

    return () => {
      playbackService.removeStatusCallback(callbackId);
    };
  }, []);

  const debouncedTogglePlayPause = useDebounce(
    useCallback(() => {
      dispatch(togglePlayback());
    }, [dispatch]),
    DEBOUNCE_MS
  );

  const debouncedPlayNext = useDebounce(
    useCallback(() => {
      dispatch(skipNext());
    }, [dispatch]),
    DEBOUNCE_MS
  );

  const handleTogglePlayPause = useCallback((e: any) => {
    e.stopPropagation();
    debouncedTogglePlayPause();
  }, [debouncedTogglePlayPause]);

  const handlePlayNext = useCallback((e: any) => {
    e.stopPropagation();
    debouncedPlayNext();
  }, [debouncedPlayNext]);

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
            { backgroundColor: colors.primary, width: `${localProgress * 100}%` }
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
            <Ionicons name="musical-note" size={24} color={colors.textMuted} />
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
              <Ionicons name="pause-circle" size={24} color={colors.text} />
            ) : (
              <Ionicons name="play-circle" size={24} color={colors.text} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={handlePlayNext}
          >
            <Ionicons name="play-skip-forward" size={24} color={colors.text} />
          </TouchableOpacity>

          {onQueuePress && (
            <TouchableOpacity
              style={styles.controlButton}
              onPress={onQueuePress}
            >
              <Ionicons name="list" size={22} color={colors.text} />
            </TouchableOpacity>
          )}
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
