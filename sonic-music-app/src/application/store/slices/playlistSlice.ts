import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Song } from '../../../domain/models/MusicModels';

interface Playlist {
  id: string;
  name: string;
  songs: Song[];
  coverUrl?: string;
  createdAt: string;
}

interface PlaylistState {
  playlists: Playlist[];
  pendingSync: Song[];
  pendingRemove: string[];
  lastSyncedAt: number | null;
  isSyncing: boolean;
}

const initialPlaylists: Playlist[] = [
  {
    id: 'liked',
    name: 'Liked Songs',
    songs: [],
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=1000&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'favorites',
    name: 'My Favorites',
    songs: [],
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1000&auto=format&fit=crop',
    createdAt: new Date().toISOString(),
  },
];

const initialState: PlaylistState = {
  playlists: initialPlaylists,
  pendingSync: [],
  pendingRemove: [],
  lastSyncedAt: null,
  isSyncing: false,
};

const playlistSlice = createSlice({
  name: 'playlist',
  initialState,
  reducers: {
    createPlaylist: (state, action: PayloadAction<string>) => {
      const newPlaylist: Playlist = {
        id: Date.now().toString(),
        name: action.payload,
        songs: [],
        coverUrl: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?q=80&w=1000&auto=format&fit=crop',
        createdAt: new Date().toISOString(),
      };
      state.playlists.push(newPlaylist);
    },
    deletePlaylist: (state, action: PayloadAction<string>) => {
      if (action.payload === 'liked' || action.payload === 'favorites') return;
      state.playlists = state.playlists.filter((p) => p.id !== action.payload);
    },
    addToPlaylist: (state, action: PayloadAction<{ playlistId: string; song: Song }>) => {
      const { playlistId, song } = action.payload;
      const playlist = state.playlists.find((p) => p.id === playlistId);
      if (playlist && !playlist.songs.find((s) => s.id === song.id)) {
        playlist.songs.push(song);
      }
    },
    removeFromPlaylist: (state, action: PayloadAction<{ playlistId: string; songId: string }>) => {
      const { playlistId, songId } = action.payload;
      const playlist = state.playlists.find((p) => p.id === playlistId);
      if (playlist) {
        playlist.songs = playlist.songs.filter((s) => s.id !== songId);
      }
    },
    addToLiked: (state, action: PayloadAction<Song>) => {
      const likedPlaylist = state.playlists.find((p) => p.id === 'liked');
      if (likedPlaylist && !likedPlaylist.songs.find((s) => s.id === action.payload.id)) {
        likedPlaylist.songs.unshift(action.payload);
        if (!state.pendingSync.find((s) => s.id === action.payload.id)) {
          state.pendingSync.push(action.payload);
        }
        state.pendingRemove = state.pendingRemove.filter((id) => id !== action.payload.id);
      }
    },
    removeFromLiked: (state, action: PayloadAction<string>) => {
      const likedPlaylist = state.playlists.find((p) => p.id === 'liked');
      if (likedPlaylist) {
        likedPlaylist.songs = likedPlaylist.songs.filter((s) => s.id !== action.payload);
        if (!state.pendingRemove.find((id) => id === action.payload)) {
          state.pendingRemove.push(action.payload);
        }
        state.pendingSync = state.pendingSync.filter((s) => s.id !== action.payload);
      }
    },
    mergeServerFavorites: (state, action: PayloadAction<Song[]>) => {
      const likedPlaylist = state.playlists.find((p) => p.id === 'liked');
      if (!likedPlaylist) return;

      const serverFavorites = action.payload;
      const serverIds = new Set(serverFavorites.map((s) => s.id));
      
      for (const song of state.pendingSync) {
        if (!likedPlaylist.songs.find((s) => s.id === song.id)) {
          likedPlaylist.songs.push(song);
        }
      }
      
      for (const serverSong of serverFavorites) {
        if (!likedPlaylist.songs.find((s) => s.id === serverSong.id)) {
          likedPlaylist.songs.push(serverSong);
        }
      }
      
      likedPlaylist.songs.sort((a, b) => {
        const serverA = serverFavorites.find((s) => s.id === a.id);
        const serverB = serverFavorites.find((s) => s.id === b.id);
        const dateA = serverA?.favoritedAt ? new Date(serverA.favoritedAt).getTime() : 0;
        const dateB = serverB?.favoritedAt ? new Date(serverB.favoritedAt).getTime() : 0;
        return dateB - dateA;
      });

      state.pendingSync = [];
      state.lastSyncedAt = Date.now();
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    clearPendingSync: (state) => {
      state.pendingSync = [];
      state.pendingRemove = [];
    },
  },
});

export const { 
  createPlaylist, 
  deletePlaylist, 
  addToPlaylist, 
  removeFromPlaylist,
  addToLiked,
  removeFromLiked,
  mergeServerFavorites,
  setSyncing,
  clearPendingSync,
} = playlistSlice.actions;
export default playlistSlice.reducer;

export const selectPlaylists = (state: { playlist: PlaylistState }) => state.playlist.playlists;
export const selectPlaylistById = (id: string) => (state: { playlist: PlaylistState }) => 
  state.playlist.playlists.find((p) => p.id === id);
export const selectLikedSongs = (state: { playlist: PlaylistState }) => 
  state.playlist.playlists.find((p) => p.id === 'liked')?.songs || [];
export const selectIsSongLiked = (songId: string) => (state: { playlist: PlaylistState }) => 
  state.playlist.playlists.find((p) => p.id === 'liked')?.songs.some((s) => s.id === songId) || false;
export const selectPendingSync = (state: { playlist: PlaylistState }) => state.playlist.pendingSync;
export const selectPendingRemove = (state: { playlist: PlaylistState }) => state.playlist.pendingRemove;
export const selectIsSyncing = (state: { playlist: PlaylistState }) => state.playlist.isSyncing;
export const selectLastSyncedAt = (state: { playlist: PlaylistState }) => state.playlist.lastSyncedAt;