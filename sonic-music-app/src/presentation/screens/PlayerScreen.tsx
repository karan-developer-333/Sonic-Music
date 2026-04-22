import React, { useCallback, useRef, useState, memo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import { useAppSelector, useAppDispatch, selectThemeColors } from '../../application/store/hooks';
import { addToLiked, removeFromLiked } from '../../application/store/slices/playlistSlice';
import { PlaybackService } from '../../application/services/PlaybackService';
import { useQueue, useQueueProgress } from '../../application/hooks/useQueue';
import { UpNextModal } from '../components/UpNextModal';
import { createQueueItem } from '../../domain/models/QueueItem';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.8;

const DEBOUNCE_MS = 300;

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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

const PlayerScreen = memo(({ navigation }: any) => {
  const colors = useAppSelector(state => selectThemeColors(state)) as any;
  const dispatch = useAppDispatch();

  // Zustand State & Progress
  const { 
    currentSong, isPlaying, isLoading, repeat, shuffle,
    togglePlayback, skipNext, skipPrevious, toggleShuffle, toggleRepeat,
    openUpNext, isUpNextVisible, closeUpNext
  } = useQueue();

  const { progress, currentTime, duration, seek } = useQueueProgress();

  const progressBarRef = useRef<any>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [localSeekProgress, setLocalSeekProgress] = useState(0);

  const isLiked = useAppSelector((state) =>
    state.playlist.playlists.find(p => p.id === 'liked')?.songs.some(s => s.id === currentSong?.id)
  ) || false;

  const displayProgress = isSeeking ? localSeekProgress : progress;
  const displayTime = isSeeking ? localSeekProgress * (duration / 1000) : currentTime;

  const handleProgressPress = useCallback((event: any) => {
    if (progressBarRef.current) {
      progressBarRef.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        const touchX = event.nativeEvent.locationX;
        const newProgress = Math.max(0, Math.min(1, touchX / w));
        seek(newProgress);
        setIsSeeking(false);
      });
    }
  }, [seek]);

  const handleProgressPressIn = useCallback((event: any) => {
    setIsSeeking(true);
    if (progressBarRef.current) {
      progressBarRef.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        const touchX = event.nativeEvent.locationX;
        const newProgress = Math.max(0, Math.min(1, touchX / w));
        setLocalSeekProgress(newProgress);
      });
    }
  }, []);

  const handleProgressMove = useCallback((event: any) => {
    if (isSeeking && progressBarRef.current) {
      progressBarRef.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        const touchX = event.nativeEvent.locationX;
        const newProgress = Math.max(0, Math.min(1, touchX / w));
        setLocalSeekProgress(newProgress);
      });
    }
  }, [isSeeking]);

  const handleLikePress = useCallback(() => {
    if (currentSong) {
      const song = {
        id: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        coverUrl: currentSong.thumbnail,
        audioUrl: currentSong.streamUrl,
        duration: currentSong.duration ?? 0,
        source: currentSong.source,
      };
      if (isLiked) {
        dispatch(removeFromLiked(currentSong.id));
      } else {
        dispatch(addToLiked({ ...song, favoritedAt: new Date().toISOString() }));
      }
    }
  }, [currentSong, isLiked, dispatch]);

  const getRepeatIcon = useCallback(() => {
    if (repeat === 'one') {
      return <Ionicons name="repeat" size={22} color={colors.primary} />;
    }
    return <Ionicons name="repeat" size={22} color={repeat === 'none' ? colors.textMuted : colors.primary} />;
  }, [repeat, colors]);

  if (!currentSong) {
    return (
      <SafeContainer style={styles.container}>
        <Text style={[styles.noSongText, { color: colors.text }]}>No song playing</Text>
      </SafeContainer>
    );
  }

  return (
    <SafeContainer style={styles.container}>
      <LinearGradient
        colors={[colors.secondary, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="chevron-down" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Now Playing</Text>
        <TouchableOpacity style={styles.headerButton} onPress={openUpNext}>
          <Ionicons name="list" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.albumArtContainer}>
        <View style={[styles.artGlow, { backgroundColor: colors.primary }]} />
        {currentSong.thumbnail ? (
          <Image source={{ uri: currentSong.thumbnail }} style={styles.albumArt} />
        ) : (
          <View style={[styles.albumArt, { backgroundColor: colors.secondary, justifyContent: 'center', alignItems: 'center' }]}>
            <Feather name="music" size={64} color={colors.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.titleWrapper}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {currentSong.title}
          </Text>
          <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>
            {currentSong.artist}
          </Text>
        </View>
        <TouchableOpacity onPress={handleLikePress} style={styles.likeButton}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={24}
            color={isLiked ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressWrapper}>
          <Pressable
            ref={progressBarRef}
            style={[styles.progressBarBg, { backgroundColor: colors.secondary }]}
            onPressIn={handleProgressPressIn}
            onPress={handleProgressPress}
            onTouchMove={handleProgressMove}
          >
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: colors.primary, width: `${(displayProgress || 0) * 100}%` }
              ]}
            />
            <View
              style={[
                styles.progressDot,
                { backgroundColor: colors.primary, left: `${(displayProgress || 0) * 100}%` }
              ]}
            /> 
          </Pressable>
        </View>
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {formatTime(displayTime)}
          </Text>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {formatTime(duration / 1000)}
          </Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.sideControl}
          onPress={toggleShuffle}
        >
          <Ionicons
            name="shuffle"
            size={22}
            color={shuffle ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>

        <View style={styles.mainControls}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipPrevious}
          >
            <Ionicons name="play-skip-back" size={32} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: colors.primary }]}
            onPress={togglePlayback}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingIndicator}>
                <Text style={[styles.loadingText, { color: colors.background }]}>...</Text>
              </View>
            ) : isPlaying ? (
              <Ionicons name="pause" size={32} color={colors.background} />
            ) : (
              <Ionicons name="play" size={32} color={colors.background} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={skipNext}
          >
            <Ionicons name="play-skip-forward" size={32} color={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.sideControl}
          onPress={toggleRepeat}
        >
          {getRepeatIcon()}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          {shuffle ? 'Shuffle ON' : 'Playing from queue'}
          {repeat !== 'none' && ` • Repeat: ${repeat === 'one' ? '1' : 'All'}`}
        </Text>
      </View>

      {/* Up Next Modal */}
      <UpNextModal
        visible={isUpNextVisible}
        onClose={closeUpNext}
        colors={colors}
      />
    </SafeContainer>
  );
});

PlayerScreen.displayName = 'PlayerScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  headerButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  albumArtContainer: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
    position: 'relative',
  },
  albumArt: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: SIZES.radius * 1.5,
  },
  artGlow: {
    position: 'absolute',
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: SIZES.radius * 1.5,
    opacity: 0.15,
    transform: [{ scale: 1.05 }],
    zIndex: -1,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  titleWrapper: {
    flex: 1,
    marginRight: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  artist: {
    fontSize: 16,
    marginTop: 4,
  },
  likeButton: {
    padding: SPACING.xs,
  },
  progressContainer: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  progressWrapper: {
    height: 30,
    justifyContent: 'center',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'visible',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -5,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
  },
  sideControl: {
    padding: SPACING.md,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.xl,
  },
  skipButton: {
    padding: SPACING.sm,
  },
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  loadingIndicator: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: SPACING.xl,
  },
  footerText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  noSongText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export { PlayerScreen };
export default PlayerScreen;
