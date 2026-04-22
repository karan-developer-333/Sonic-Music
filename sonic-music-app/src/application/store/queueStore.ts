/**
 * Queue Store - Application Layer
 * Zustand store for managing playback queue state
 * Follows Clean Architecture: contains business logic without UI dependencies
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueItem, createQueueItem } from '../../domain/models/QueueItem';
import { PlaybackService } from '../services/PlaybackService';

// ============================================
// TYPES
// ============================================

export type RepeatMode = 'none' | 'all' | 'one';

interface QueueState {
  // Core state
  currentSong: QueueItem | null;
  queue: QueueItem[];
  history: QueueItem[];
  isPlaying: boolean;
  
  // Playback settings
  repeat: RepeatMode;
  shuffle: boolean;
  originalQueue: QueueItem[]; // For shuffle restore
  
  // Playback progress
  progress: number;
  currentTime: number;
  duration: number;
  
  // UI state
  isUpNextVisible: boolean;
  isLoading: boolean;
  error: string | null;

  // Stats (Migrated from historySlice)
  artistStats: Record<string, { artist: string; playCount: number; lastPlayed: number }>;
  genreStats: Record<string, { genre: string; playCount: number; lastPlayed: number }>;
  totalPlayTime: number;
}

interface QueueActions {
  // Playback controls
  playSong: (song: QueueItem | QueueItem[], index?: number) => void;
  togglePlayback: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  seek: (progress: number) => void;
  
  // Progress management
  updateProgress: (progress: number, currentTime: number, duration: number) => void;
  setPlaybackStatus: (status: { 
    isPlaying: boolean; 
    progress: number; 
    currentTime: number; 
    duration: number;
    didJustFinish?: boolean;
  }) => void;
  
  // Queue management
  addToQueue: (song: QueueItem) => void;
  playNext: (song: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  
  // History
  addToHistory: (song: QueueItem) => void;
  clearHistory: () => void;
  
  // Settings
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  
  // UI
  setUpNextVisible: (visible: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utilities
  getNextSongs: () => QueueItem[];
  getUpNextCount: () => number;
  isInQueue: (id: string) => boolean;
  getCurrentIndex: () => number;
}

// ============================================
// STORE
// ============================================

const MAX_HISTORY_SIZE = 50;

// Helper to shuffle array
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const useQueueStore = create<QueueState & QueueActions>()(
  persist(
    (set, get) => ({
      // Initial state
      currentSong: null,
      queue: [],
      history: [],
      isPlaying: false,
      repeat: 'none',
      shuffle: false,
      originalQueue: [],
      progress: 0,
      currentTime: 0,
      duration: 0,
      isUpNextVisible: false,
      isLoading: false,
      error: null,
      artistStats: {},
      genreStats: {},
      totalPlayTime: 0,

      // ==========================================
      // PLAYBACK CONTROLS
      // ==========================================
      
      playSong: async (songOrSongs, startIndex = 0) => {
        const state = get();
        const playbackService = PlaybackService.getInstance();
        
        try {
          set({ isLoading: true, error: null });

          // Handle single song or array
          let songs: QueueItem[];
          let currentSong: QueueItem;

          if (Array.isArray(songOrSongs)) {
            songs = songOrSongs;
            currentSong = songs[startIndex] || songs[0];
          } else {
            currentSong = songOrSongs;
            // Ensure the song is in some queue context
            songs = state.queue.some(s => s.id === currentSong.id) ? state.queue : [currentSong, ...state.queue];
          }

          // Save previous current song to history if it's different
          if (state.currentSong && state.currentSong.id !== currentSong.id) {
            get().addToHistory(state.currentSong);
          }

          // Update upcoming queue
          const newUpcomingQueue = songs.filter(s => s.id !== currentSong.id);
          
          set({
            currentSong,
            queue: newUpcomingQueue,
            originalQueue: state.shuffle ? (state.originalQueue.length > 0 ? state.originalQueue : [currentSong, ...newUpcomingQueue]) : newUpcomingQueue,
            isPlaying: true,
            progress: 0,
            currentTime: 0,
          });

          await playbackService.loadAndPlay({
            id: currentSong.id,
            title: currentSong.title,
            artist: currentSong.artist,
            coverUrl: currentSong.thumbnail,
            audioUrl: currentSong.streamUrl,
            duration: currentSong.duration || 0,
            source: currentSong.source || 'saavn',
          });

        } catch (error) {
          console.error('[QueueStore] Error playing song:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to play song',
            isPlaying: false 
          });
        } finally {
          set({ isLoading: false });
        }
      },

      togglePlayback: async () => {
        const { isPlaying, currentSong } = get();
        
        if (!currentSong) return;

        try {
          const playbackService = PlaybackService.getInstance();
          await playbackService.togglePlayPause(!isPlaying);
          set({ isPlaying: !isPlaying });
        } catch (error) {
          console.error('[QueueStore] Error toggling playback:', error);
          set({ error: 'Failed to toggle playback' });
        }
      },

      skipNext: async () => {
        const state = get();
        const { currentSong, queue, repeat } = state;
        
        if (!currentSong) return;

        try {
          // Handle repeat one
          if (repeat === 'one') {
            await get().playSong(currentSong);
            return;
          }

          let nextSong: QueueItem | null = null;

          if (queue.length > 0) {
            nextSong = queue[0];
          } else if (repeat === 'all') {
            const restartQueue = state.originalQueue.length > 0 ? state.originalQueue : state.queue;
            if (restartQueue.length > 0) {
              nextSong = restartQueue[0];
            }
          }

          if (nextSong) {
            await get().playSong(nextSong);
          } else {
            // No more songs, stop playback
            set({ isPlaying: false });
          }
        } catch (error) {
          console.error('[QueueStore] Error skipping next:', error);
          set({ error: 'Failed to skip to next song' });
        }
      },

      skipPrevious: async () => {
        const { history, currentSong, currentTime } = get();
        
        if (!currentSong) return;

        // If played more than 3 seconds, just restart the song
        if (currentTime > 3) {
          await get().playSong(currentSong);
          return;
        }

        try {
          if (history.length > 0) {
            // Play from history
            const previousSong = history[history.length - 1];
            const newHistory = history.slice(0, -1);
            
            // Add current song back to the start of the queue
            const newQueue = [currentSong, ...get().queue];
            
            set({ history: newHistory, queue: newQueue });
            await get().playSong(previousSong);
          } else {
            // Restart current song
            await get().playSong(currentSong);
          }
        } catch (error) {
          console.error('[QueueStore] Error skipping previous:', error);
          set({ error: 'Failed to skip to previous song' });
        }
      },

      seek: async (progress) => {
        const { duration } = get();
        if (duration <= 0) return;
        
        try {
          const positionMillis = progress * duration;
          await PlaybackService.getInstance().seekTo(positionMillis);
          set({ progress, currentTime: positionMillis / 1000 });
        } catch (error) {
          console.error('[QueueStore] Error seeking:', error);
        }
      },

      // ==========================================
      // PROGRESS MANAGEMENT
      // ==========================================

      updateProgress: (progress, currentTime, duration) => {
        set({ progress, currentTime, duration });
      },

      setPlaybackStatus: (status) => {
        const updates: Partial<QueueState> = {
          isPlaying: status.isPlaying,
          progress: status.progress,
          currentTime: status.currentTime,
          duration: status.duration,
        };
        
        set(updates);

        if (status.didJustFinish) {
          get().skipNext();
        }
      },

      // ==========================================
      // QUEUE MANAGEMENT
      // ==========================================

      addToQueue: (song) => {
        const state = get();
        
        if (state.queue.some(s => s.id === song.id)) {
          console.log('[QueueStore] Song already in queue');
          return;
        }

        set({
          queue: [...state.queue, song],
          originalQueue: state.shuffle ? [...state.originalQueue, song] : state.originalQueue,
        });
      },

      playNext: (song) => {
        const state = get();
        
        // Remove if already exists
        const filteredQueue = state.queue.filter(s => s.id !== song.id);
        
        set({
          queue: [song, ...filteredQueue],
          originalQueue: state.shuffle 
            ? [song, ...state.originalQueue.filter(s => s.id !== song.id)] 
            : state.originalQueue,
        });
      },

      removeFromQueue: (id) => {
        const state = get();
        set({
          queue: state.queue.filter(s => s.id !== id),
          originalQueue: state.originalQueue.filter(s => s.id !== id),
        });
      },

      reorderQueue: (fromIndex, toIndex) => {
        const state = get();
        const queue = [...state.queue];
        
        if (typeof fromIndex !== 'number' || typeof toIndex !== 'number' ||
            fromIndex < 0 || fromIndex >= queue.length || 
            toIndex < 0 || toIndex >= queue.length ||
            fromIndex === toIndex) {
          return;
        }

        const [removed] = queue.splice(fromIndex, 1);
        queue.splice(toIndex, 0, removed);

        set({ queue });
      },

      clearQueue: () => {
        set({ 
          queue: [], 
          originalQueue: [], 
          history: [],
          currentSong: null,
          isPlaying: false,
          artistStats: {},
          genreStats: {},
          totalPlayTime: 0,
        });
      },

      addToHistory: (song) => {
        const state = get();
        
        // 1. History list
        const newHistory = [song, ...state.history.filter(s => s.id !== song.id)].slice(0, MAX_HISTORY_SIZE);
        
        // 2. Stats
        const artistStats = { ...state.artistStats };
        const artist = song.artist || 'Unknown Artist';
        if (artistStats[artist]) {
          artistStats[artist] = { ...artistStats[artist], playCount: artistStats[artist].playCount + 1, lastPlayed: Date.now() };
        } else {
          artistStats[artist] = { artist, playCount: 1, lastPlayed: Date.now() };
        }

        const genreStats = { ...state.genreStats };
        const genre = 'Unknown'; // Genre not always available in QueueItem currently
        if (genreStats[genre]) {
          genreStats[genre] = { ...genreStats[genre], playCount: genreStats[genre].playCount + 1, lastPlayed: Date.now() };
        } else {
          genreStats[genre] = { genre, playCount: 1, lastPlayed: Date.now() };
        }

        set({ 
          history: newHistory,
          artistStats,
          genreStats,
          totalPlayTime: state.totalPlayTime + (song.duration || 0)
        });
      },

      clearHistory: () => {
        set({ 
          history: [],
          artistStats: {},
          genreStats: {},
          totalPlayTime: 0,
        });
      },

      // ==========================================
      // SETTINGS
      // ==========================================

      toggleRepeat: () => {
        const modes: RepeatMode[] = ['none', 'all', 'one'];
        const state = get();
        const nextIndex = (modes.indexOf(state.repeat) + 1) % modes.length;
        set({ repeat: modes[nextIndex] });
      },

      toggleShuffle: () => {
        const state = get();
        const newShuffle = !state.shuffle;
        
        if (newShuffle && state.queue.length > 0) {
          // Enable shuffle
          set({
            shuffle: newShuffle,
            originalQueue: [...state.queue],
            queue: shuffleArray(state.queue),
          });
        } else {
          // Disable shuffle - restore original order
          set({
            shuffle: newShuffle,
            queue: [...state.originalQueue],
          });
        }
      },

      setRepeatMode: (mode) => {
        set({ repeat: mode });
      },

      // ==========================================
      // UI
      // ==========================================

      setUpNextVisible: (visible) => {
        set({ isUpNextVisible: visible });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      // ==========================================
      // UTILITIES
      // ==========================================

      getNextSongs: () => {
        return get().queue;
      },

      getUpNextCount: () => {
        return get().queue.length;
      },

      isInQueue: (id) => {
        return get().queue.some(s => s.id === id) || get().currentSong?.id === id;
      },

      getCurrentIndex: () => {
        const state = get();
        if (!state.currentSong) return -1;
        return state.queue.findIndex(s => s.id === state.currentSong?.id);
      },
    }),
    {
      name: '@sonic_queue_store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        queue: state.queue,
        originalQueue: state.originalQueue,
        history: state.history,
        repeat: state.repeat,
        shuffle: state.shuffle,
        currentSong: state.currentSong,
      }),
    }
  )
);

// ============================================
// SELECTORS (for performance)
// ============================================

export const selectCurrentSong = (state: QueueState) => state.currentSong;
export const selectQueue = (state: QueueState) => state.queue;
export const selectIsPlaying = (state: QueueState) => state.isPlaying;
export const selectIsUpNextVisible = (state: QueueState) => state.isUpNextVisible;
export const selectIsLoading = (state: QueueState) => state.isLoading;
export const selectError = (state: QueueState) => state.error;
export const selectRepeat = (state: QueueState) => state.repeat;
export const selectShuffle = (state: QueueState) => state.shuffle;
export const selectPlaybackProgress = (state: QueueState) => ({
  progress: state.progress,
  currentTime: state.currentTime,
  duration: state.duration,
});

export const selectTopArtists = (state: QueueState) => {
  const artists = Object.values(state.artistStats);
  return artists.sort((a, b) => b.playCount - a.playCount || b.lastPlayed - a.lastPlayed).slice(0, 10).map(a => a.artist);
};

export const selectTopGenres = (state: QueueState) => {
  const genres = Object.values(state.genreStats);
  return genres.sort((a, b) => b.playCount - a.playCount || b.lastPlayed - a.lastPlayed).slice(0, 5).map(g => g.genre);
};

export const selectRecommendations = (state: QueueState, limit = 10) => {
  const topGenres = selectTopGenres(state).slice(0, 3);
  const topArtists = selectTopArtists(state).slice(0, 5);
  
  if (topGenres.length === 1 && topGenres[0] === 'Unknown' && topArtists.length === 0) {
    return ['bollywood', 'indian', 'hindustani'].slice(0, limit);
  }

  const recommendations: string[] = [];
  
  topGenres.forEach((genre) => {
    if (genre !== 'Unknown' && !recommendations.includes(genre) && recommendations.length < limit) {
      recommendations.push(genre);
    }
  });

  topArtists.forEach((artist) => {
    const genreFromArtist = artist.toLowerCase().includes('rock') ? 'rock' :
      artist.toLowerCase().includes('pop') ? 'pop' :
      artist.toLowerCase().includes('classical') ? 'classical' :
      artist.toLowerCase().includes('devotional') ? 'devotional' :
      'bollywood';
    
    if (!recommendations.includes(genreFromArtist) && recommendations.length < limit) {
      recommendations.push(genreFromArtist);
    }
  });

  if (recommendations.length < limit) {
    const defaults = ['bollywood', 'indian', 'hindustani', 'romantic', 'party'];
    defaults.forEach((d) => {
      if (!recommendations.includes(d) && recommendations.length < limit) {
        recommendations.push(d);
      }
    });
  }

  return recommendations.slice(0, limit);
};
