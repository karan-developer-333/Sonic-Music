import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Song } from '../../../domain/models/MusicModels';

interface ListeningHistoryEntry {
  songId: string;
  artist: string;
  genre: string;
  playedAt: number;
  duration: number;
  completed: boolean;
}

interface ArtistStats {
  artist: string;
  playCount: number;
  lastPlayed: number;
}

interface GenreStats {
  genre: string;
  playCount: number;
  lastPlayed: number;
}

interface HistoryState {
  history: ListeningHistoryEntry[];
  artistStats: Record<string, ArtistStats>;
  genreStats: Record<string, GenreStats>;
  totalPlayTime: number;
}

const MAX_HISTORY_SIZE = 500;

const initialState: HistoryState = {
  history: [],
  artistStats: {},
  genreStats: {},
  totalPlayTime: 0,
};

const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addToHistory: (state, action: PayloadAction<{ song: Song; duration: number; completed: boolean }>) => {
      const { song, duration, completed } = action.payload;
      
      const entry: ListeningHistoryEntry = {
        songId: song.id,
        artist: song.artist,
        genre: song.categoryId,
        playedAt: Date.now(),
        duration,
        completed,
      };

      state.history = [...state.history, entry].slice(-MAX_HISTORY_SIZE);

      const artistKey = song.artist;
      if (state.artistStats[artistKey]) {
        state.artistStats[artistKey].playCount += 1;
        state.artistStats[artistKey].lastPlayed = Date.now();
      } else {
        state.artistStats[artistKey] = {
          artist: song.artist,
          playCount: 1,
          lastPlayed: Date.now(),
        };
      }

      const genreKey = song.categoryId;
      if (state.genreStats[genreKey]) {
        state.genreStats[genreKey].playCount += 1;
        state.genreStats[genreKey].lastPlayed = Date.now();
      } else {
        state.genreStats[genreKey] = {
          genre: song.categoryId,
          playCount: 1,
          lastPlayed: Date.now(),
        };
      }

      state.totalPlayTime += duration;
    },
    clearHistory: (state) => {
      state.history = [];
      state.artistStats = {};
      state.genreStats = {};
      state.totalPlayTime = 0;
    },
  },
});

export const { addToHistory, clearHistory } = historySlice.actions;
export default historySlice.reducer;

export const selectHistory = (state: { history: HistoryState }) => state.history.history;
export const selectTopArtists = (state: { history: HistoryState }) => {
  const artists = Object.values(state.history.artistStats);
  return artists.sort((a, b) => b.playCount - a.playCount || b.lastPlayed - a.lastPlayed).slice(0, 10).map(a => a.artist);
};
export const selectTopGenres = (state: { history: HistoryState }) => {
  const genres = Object.values(state.history.genreStats);
  return genres.sort((a, b) => b.playCount - a.playCount || b.lastPlayed - a.lastPlayed).slice(0, 5).map(g => g.genre);
};
export const selectRecommendations = (limit = 10) => (state: { history: HistoryState }) => {
  const topGenres = selectTopGenres(state).slice(0, 3);
  const topArtists = selectTopArtists(state).slice(0, 5);
  
  if (topGenres.length === 0 && topArtists.length === 0) {
    return ['bollywood', 'indian', 'hindustani'].slice(0, limit);
  }

  const recommendations: string[] = [];
  
  topGenres.forEach((genre) => {
    if (!recommendations.includes(genre) && recommendations.length < limit) {
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