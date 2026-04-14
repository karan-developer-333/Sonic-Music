import React, { useCallback, useMemo, useState, useRef } from 'react';
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
import { MiniPlayer } from '../components/MiniPlayer';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ChevronDown, 
  MoreHorizontal, 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  Heart, 
  Repeat, 
  Repeat1,
  Shuffle 
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.8;

const formatTime = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { togglePlayback, playNext, playPrevious, seekToPosition, toggleShuffle, toggleRepeat } from '../../application/store/slices/playerSlice';
import { addToPlaylist, removeFromPlaylist } from '../../application/store/slices/playlistSlice';

export const PlayerScreen = React.memo(({ navigation }: any) => {
  const { 
    currentSong, 
    isPlaying,
    isLoading,
    progress, 
    currentTime,
    duration,
    shuffle,
    repeat,
  } = useAppSelector(state => state.player);
  
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();
  
  const progressBarRef = useRef<View>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);
  const [seekTime, setSeekTime] = useState(0);

  const isLiked = useAppSelector(state => 
    state.playlist.playlists.find(p => p.id === 'liked')?.songs.some(s => s.id === currentSong?.id)
  ) || false;
  const displayProgress = isSeeking ? seekProgress : progress;
  const displayTime = isSeeking ? seekTime : currentTime;
  const totalDuration = duration || currentSong?.duration || 0;

  const handleProgressPress = useCallback((event: any) => {
    if (progressBarRef.current) {
      progressBarRef.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        const touchX = event.nativeEvent.locationX;
        const newProgress = Math.max(0, Math.min(1, touchX / w));
        const newTime = newProgress * (duration || 0);
        setSeekProgress(newProgress);
        setSeekTime(newTime);
        dispatch(seekToPosition(newProgress));
        setIsSeeking(false);
      });
    }
  }, [duration, dispatch]);

  const handleProgressPressIn = useCallback((event: any) => {
    setIsSeeking(true);
    if (progressBarRef.current) {
      progressBarRef.current.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
        const touchX = event.nativeEvent.locationX;
        const newProgress = Math.max(0, Math.min(1, touchX / w));
        const newTime = newProgress * (duration || 0);
        setSeekProgress(newProgress);
        setSeekTime(newTime);
      });
    }
  }, [duration]);

  const handleLikePress = useCallback(() => {
    if (currentSong) {
      if (isLiked) {
        dispatch(removeFromPlaylist({ playlistId: 'liked', songId: currentSong.id }));
      } else {
        dispatch(addToPlaylist({ playlistId: 'liked', song: currentSong }));
      }
    }
  }, [currentSong, isLiked, dispatch]);

  const getRepeatIcon = useCallback(() => {
    if (repeat === 'one') {
      return <Repeat1 size={22} color={colors.primary} />;
    }
    return <Repeat size={22} color={repeat === 'none' ? colors.textMuted : colors.primary} />;
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
          <ChevronDown size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Now Playing</Text>
        <TouchableOpacity style={styles.headerButton}>
          <MoreHorizontal size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.albumArtContainer}>
        <View style={[styles.artGlow, { backgroundColor: colors.primary }]} />
        <Image source={{ uri: currentSong.coverUrl }} style={styles.albumArt} />
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
          <Heart 
            size={24} 
            color={isLiked ? colors.primary : colors.textMuted} 
            fill={isLiked ? colors.primary : 'transparent'} 
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
          >
            <View 
              style={[
                styles.progressBarFill, 
                { backgroundColor: colors.primary, width: `${displayProgress * 100}%` }
              ]}
            />
            <View 
              style={[
                styles.progressDot, 
                { backgroundColor: colors.primary, left: `${displayProgress * 100}%` }
              ]} 
            />
          </Pressable>
        </View>
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {formatTime(displayTime)}
          </Text>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>
            {formatTime(totalDuration)}
          </Text>
        </View>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.sideControl}
          onPress={() => dispatch(toggleShuffle())}
        >
          <Shuffle 
            size={22} 
            color={shuffle ? colors.primary : colors.textMuted} 
          />
        </TouchableOpacity>
        
        <View style={styles.mainControls}>
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => dispatch(playPrevious())}
          >
            <SkipBack size={32} color={colors.text} fill={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.playButton, { backgroundColor: colors.primary }]} 
            onPress={() => dispatch(togglePlayback())}
            activeOpacity={0.8}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingIndicator}>
                <Text style={[styles.loadingText, { color: colors.background }]}>...</Text>
              </View>
            ) : isPlaying ? (
              <Pause size={32} color={colors.background} fill={colors.background} />
            ) : (
              <Play size={32} color={colors.background} fill={colors.background} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.skipButton}
            onPress={() => dispatch(playNext())}
          >
            <SkipForward size={32} color={colors.text} fill={colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.sideControl}
          onPress={() => dispatch(toggleRepeat())}
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
    </SafeContainer>
  );
});

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
