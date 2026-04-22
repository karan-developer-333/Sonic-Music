/**
 * useQueue Hook - Application Layer
 * Provides a convenient interface for queue operations
 * Encapsulates Zustand store interactions
 */

import { useCallback, useMemo } from 'react';
import { useQueueStore, RepeatMode } from '../store/queueStore';
import { QueueItem } from '../../domain/models/QueueItem';
import { selectRecommendations as selectRecommendedGenres } from '../store/queueStore';

// Re-export types
export type { RepeatMode, QueueItem };

/**
 * Main hook for queue operations
 * Combines state and actions in one interface
 */
export const useQueue = () => {
  const currentSong = useQueueStore(state => state.currentSong);
  const queue = useQueueStore(state => state.queue);
  const history = useQueueStore(state => state.history);
  const isPlaying = useQueueStore(state => state.isPlaying);
  const isUpNextVisible = useQueueStore(state => state.isUpNextVisible);
  const isLoading = useQueueStore(state => state.isLoading);
  const error = useQueueStore(state => state.error);
  const repeat = useQueueStore(state => state.repeat);
  const shuffle = useQueueStore(state => state.shuffle);

  const upcomingSongs = useMemo(() => queue, [queue]);
  const upNextCount = queue.length;
  const hasNext = queue.length > 0 || repeat !== 'none';
  const hasPrevious = history.length > 0;

  const openUpNext = useCallback(() => {
    useQueueStore.getState().setUpNextVisible(true);
  }, []);

  const closeUpNext = useCallback(() => {
    useQueueStore.getState().setUpNextVisible(false);
  }, []);

  const toggleUpNext = useCallback(() => {
    const { isUpNextVisible } = useQueueStore.getState();
    useQueueStore.getState().setUpNextVisible(!isUpNextVisible);
  }, []);

  const playSong = useCallback((songOrSongs: QueueItem | QueueItem[], startIndex?: number) => {
    return useQueueStore.getState().playSong(songOrSongs, startIndex);
  }, []);

  const togglePlayback = useCallback(() => {
    return useQueueStore.getState().togglePlayback();
  }, []);

  const skipNext = useCallback(() => {
    return useQueueStore.getState().skipNext();
  }, []);

  const skipPrevious = useCallback(() => {
    return useQueueStore.getState().skipPrevious();
  }, []);

  const seek = useCallback((progress: number) => {
    return useQueueStore.getState().seek(progress);
  }, []);

  const addToQueue = useCallback((song: QueueItem) => {
    return useQueueStore.getState().addToQueue(song);
  }, []);

  const playNext = useCallback((song: QueueItem) => {
    return useQueueStore.getState().playNext(song);
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    return useQueueStore.getState().removeFromQueue(id);
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    return useQueueStore.getState().reorderQueue(fromIndex, toIndex);
  }, []);

  const clearQueue = useCallback(() => {
    return useQueueStore.getState().clearQueue();
  }, []);

  const toggleRepeat = useCallback(() => {
    return useQueueStore.getState().toggleRepeat();
  }, []);

  const toggleShuffle = useCallback(() => {
    return useQueueStore.getState().toggleShuffle();
  }, []);

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    return useQueueStore.getState().setRepeatMode(mode);
  }, []);

  const isInQueue = useCallback((id: string) => {
    return useQueueStore.getState().isInQueue(id);
  }, []);

  const getRecommendations = useCallback((limit = 5) => {
    return selectRecommendedGenres(useQueueStore.getState(), limit);
  }, []);

  return {
    currentSong,
    queue,
    history,
    isPlaying,
    isUpNextVisible,
    isLoading,
    error,
    repeat,
    shuffle,
    upcomingSongs,
    upNextCount,
    hasNext,
    hasPrevious,
    recommendations: [], // Deprecated: use getRecommendations() instead
    getRecommendations,
    playSong,
    togglePlayback,
    skipNext,
    skipPrevious,
    seek,
    addToQueue,
    playNext,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    toggleRepeat,
    toggleShuffle,
    setRepeatMode,
    openUpNext,
    closeUpNext,
    toggleUpNext,
    isInQueue,
  };
};

/**
 * Hook for high-frequency progress updates
 */
export const useQueueProgress = () => {
  const progress = useQueueStore(state => state.progress);
  const currentTime = useQueueStore(state => state.currentTime);
  const duration = useQueueStore(state => state.duration);
  const seek = useQueueStore.getState().seek;

  return {
    progress,
    currentTime,
    duration,
    seek,
  };
};

/**
 * Hook for just queue actions
 */
export const useQueueActions = () => {
  const actions = useQueueStore.getState();
  
  return {
    playSong: actions.playSong,
    addToQueue: actions.addToQueue,
    playNext: actions.playNext,
    removeFromQueue: actions.removeFromQueue,
    reorderQueue: actions.reorderQueue,
    clearQueue: actions.clearQueue,
    skipNext: actions.skipNext,
    skipPrevious: actions.skipPrevious,
    togglePlayback: actions.togglePlayback,
    toggleRepeat: actions.toggleRepeat,
    toggleShuffle: actions.toggleShuffle,
    setRepeatMode: actions.setRepeatMode,
    setUpNextVisible: actions.setUpNextVisible,
    seek: actions.seek,
  };
};

/**
 * Hook for reading queue state
 */
export const useQueueState = () => {
  return useQueueStore(state => ({
    currentSong: state.currentSong,
    queue: state.queue,
    isPlaying: state.isPlaying,
    repeat: state.repeat,
    shuffle: state.shuffle,
    isLoading: state.isLoading,
  }));
};

