import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Theme selectors
const selectThemeState = (state: RootState) => state.theme;

export const selectThemeColors = createSelector(
  [selectThemeState],
  (theme) => theme.colors
);

export const selectThemeMode = createSelector(
  [selectThemeState],
  (theme) => theme.mode
);

// Playlist selectors
const selectPlaylistState = (state: RootState) => state.playlist;

export const selectPlaylists = createSelector(
  [selectPlaylistState],
  (playlist) => playlist.playlists
);

export const selectLikedPlaylist = createSelector(
  [selectPlaylists],
  (playlists) => playlists.find(p => p.id === 'liked')
);
