import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Memoized player selectors
const selectPlayerState = (state: RootState) => state.player;

export const selectCurrentSong = createSelector(
  [selectPlayerState],
  (player) => player.currentSong
);

export const selectIsPlaying = createSelector(
  [selectPlayerState],
  (player) => player.isPlaying
);

export const selectIsLoading = createSelector(
  [selectPlayerState],
  (player) => player.isLoading
);

export const selectProgress = createSelector(
  [selectPlayerState],
  (player) => player.progress
);

export const selectCurrentTime = createSelector(
  [selectPlayerState],
  (player) => player.currentTime
);

export const selectDuration = createSelector(
  [selectPlayerState],
  (player) => player.duration
);

export const selectQueue = createSelector(
  [selectPlayerState],
  (player) => player.queue
);

export const selectShuffle = createSelector(
  [selectPlayerState],
  (player) => player.shuffle
);

export const selectRepeat = createSelector(
  [selectPlayerState],
  (player) => player.repeat
);

export const selectPlayerError = createSelector(
  [selectPlayerState],
  (player) => player.error
);

export const selectQueueDrawerOpen = createSelector(
  [selectPlayerState],
  (player) => player.queueDrawerOpen
);

// Composite selector for player essential data
export const selectPlayerEssential = createSelector(
  [selectPlayerState],
  (player) => ({
    currentSong: player.currentSong,
    isPlaying: player.isPlaying,
    isLoading: player.isLoading,
    progress: player.progress,
    currentTime: player.currentTime,
    duration: player.duration,
  })
);

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
