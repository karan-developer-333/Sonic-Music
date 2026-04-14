import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../../domain/models/MusicModels';
import { PlaybackService } from '../../services/PlaybackService';
import { addToHistory } from './historySlice';

export type RepeatMode = 'none' | 'all' | 'one';

interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  queue: Song[];
  originalQueue: Song[];
  shuffle: boolean;
  shuffleQueue: Song[];
  repeat: RepeatMode;
  isLoading: boolean;
  error: string | null;
}

const initialState: PlayerState = {
  currentSong: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  currentTime: 0,
  queue: [],
  originalQueue: [],
  shuffle: false,
  shuffleQueue: [],
  repeat: 'none',
  isLoading: false,
  error: null,
};

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// Async Thunks
export const playSong = createAsyncThunk(
  'player/playSong',
  async ({ song, queue }: { song: Song; queue?: Song[] }, { dispatch, getState }) => {
    const state = (getState() as any).player as PlayerState;
    const previousSong = state.currentSong;
    const previousDuration = state.currentTime * 1000;
    
    // Record history of the previous song if it played for more than 5 seconds
    if (previousSong && previousDuration > 5000) {
      dispatch(addToHistory({ song: previousSong, duration: previousDuration / 1000, completed: false }));
    }

    const playbackService = PlaybackService.getInstance();

    // Setup status callback once
    playbackService.setStatusCallback((status) => {
      if (status.isLoaded) {
        dispatch(updatePlaybackStatus({
          progress: status.positionMillis / (status.durationMillis || 1),
          currentTime: status.positionMillis / 1000,
          duration: status.durationMillis || 0,
          isPlaying: status.isPlaying,
        }));
      }
      if (status.didJustFinish) {
        dispatch(skipNext());
      }
    });

    const newQueue = queue && queue.length > 0 ? queue : state.queue.length > 0 ? state.queue : [song];
    
    dispatch(setQueue(newQueue));
    
    try {
      await playbackService.loadAndPlay(song);
      return song;
    } catch (error: any) {
      throw error.message || 'Failed to play song';
    }
  }
);

export const togglePlayback = createAsyncThunk(
  'player/togglePlayback',
  async (_, { getState }) => {
    const { isPlaying } = (getState() as any).player as PlayerState;
    await PlaybackService.getInstance().togglePlayPause(!isPlaying);
    return !isPlaying;
  }
);

export const seekToPosition = createAsyncThunk(
  'player/seekToPosition',
  async (progress: number, { getState }) => {
    const { duration } = (getState() as any).player as PlayerState;
    const positionMillis = progress * duration;
    await PlaybackService.getInstance().seekTo(positionMillis);
    return progress;
  }
);

export const skipNext = createAsyncThunk(
  'player/skipNext',
  async (_, { dispatch, getState }) => {
    const state = (getState() as any).player as PlayerState;
    const { currentSong, repeat, shuffle, queue, shuffleQueue } = state;
    
    if (repeat === 'one' && currentSong) {
      await PlaybackService.getInstance().loadAndPlay(currentSong);
      return currentSong;
    }

    const queueToUse = shuffle ? shuffleQueue : queue;
    const currentIndex = queueToUse.findIndex(s => s.id === currentSong?.id);
    let nextSong: Song | null = null;

    if (currentIndex !== -1 && currentIndex < queueToUse.length - 1) {
      nextSong = queueToUse[currentIndex + 1];
    } else if (repeat === 'all' && queueToUse.length > 0) {
      nextSong = queueToUse[0];
    }

    if (nextSong) {
      await PlaybackService.getInstance().loadAndPlay(nextSong);
      return nextSong;
    }
    
    return currentSong;
  }
);

export const skipPrevious = createAsyncThunk(
  'player/skipPrevious',
  async (_, { dispatch, getState }) => {
    const state = (getState() as any).player as PlayerState;
    const { currentSong, shuffle, queue, shuffleQueue } = state;
    
    const queueToUse = shuffle ? shuffleQueue : queue;
    const currentIndex = queueToUse.findIndex(s => s.id === currentSong?.id);
    let prevSong: Song | null = null;

    if (currentIndex > 0) {
      prevSong = queueToUse[currentIndex - 1];
    } else if (queueToUse.length > 0) {
      prevSong = queueToUse[queueToUse.length - 1]; // Loop to end
    }

    if (prevSong) {
      await PlaybackService.getInstance().loadAndPlay(prevSong);
      return prevSong;
    }
    
    return currentSong;
  }
);

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    updatePlaybackStatus: (state, action: PayloadAction<{ progress: number; currentTime: number; duration: number; isPlaying: boolean }>) => {
      state.progress = action.payload.progress;
      state.currentTime = action.payload.currentTime;
      state.duration = action.payload.duration;
      state.isPlaying = action.payload.isPlaying;
    },
    setQueue: (state, action: PayloadAction<Song[]>) => {
      state.queue = action.payload;
      state.originalQueue = action.payload;
      if (state.shuffle) {
        state.shuffleQueue = shuffleArray(action.payload);
      }
    },
    toggleShuffle: (state) => {
      state.shuffle = !state.shuffle;
      if (state.shuffle && state.originalQueue.length > 0) {
        state.shuffleQueue = shuffleArray(state.originalQueue);
      }
    },
    toggleRepeat: (state) => {
      const modes: RepeatMode[] = ['none', 'all', 'one'];
      const nextIndex = (modes.indexOf(state.repeat) + 1) % modes.length;
      state.repeat = modes[nextIndex];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(playSong.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(playSong.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSong = action.payload;
        state.isPlaying = true;
      })
      .addCase(playSong.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to play song';
      })
      .addCase(togglePlayback.fulfilled, (state, action) => {
        state.isPlaying = action.payload;
      })
      .addCase(skipNext.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(skipNext.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSong = action.payload;
        state.isPlaying = true;
      })
      .addCase(skipPrevious.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(skipPrevious.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentSong = action.payload;
        state.isPlaying = true;
      });
  },
});

export const { 
  updatePlaybackStatus, 
  setQueue, 
  toggleShuffle, 
  toggleRepeat,
} = playerSlice.actions;

export default playerSlice.reducer;