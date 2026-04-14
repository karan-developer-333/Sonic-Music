import { createSlice, PayloadAction } from '@reduxjs/toolkit';
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
  },
});

export const { createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist } = playlistSlice.actions;
export default playlistSlice.reducer;

export const selectPlaylists = (state: { playlist: PlaylistState }) => state.playlist.playlists;
export const selectPlaylistById = (id: string) => (state: { playlist: PlaylistState }) => 
  state.playlist.playlists.find((p) => p.id === id);
export const selectLikedSongs = (state: { playlist: PlaylistState }) => 
  state.playlist.playlists.find((p) => p.id === 'liked')?.songs || [];
export const selectIsSongLiked = (songId: string) => (state: { playlist: PlaylistState }) => 
  state.playlist.playlists.find((p) => p.id === 'liked')?.songs.some((s) => s.id === songId) || false;