import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ThemeMode = 'dark' | 'light';

interface ThemeColors {
  background: string;
  primary: string;
  secondary: string;
  text: string;
  textMuted: string;
  danger: string;
  card: string;
  glass: string;
  glow: string;
  skeleton: string;
  error: string;
}

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
}

const darkColors: ThemeColors = {
  background: '#0D0D0D',
  primary: '#A3FF12',
  secondary: '#1A1A1A',
  text: '#FFFFFF',
  textMuted: '#888888',
  danger: '#FF4136',
  card: '#111111',
  glass: 'rgba(33, 54, 19, 0.84)',
  glow: 'rgba(163, 255, 18, 0.3)',
  skeleton: '#1A1A1A',
  error: '#FF4136',
};

const lightColors: ThemeColors = {
  background: '#F5F5F5',
  primary: '#7CB305',
  secondary: '#E8E8E8',
  text: '#1A1A1A',
  textMuted: '#666666',
  danger: '#FF4136',
  card: '#FFFFFF',
  glass: 'rgba(255, 255, 255, 0.71)',
  glow: 'rgba(124, 179, 5, 0.3)',
  skeleton: '#E0E0E0',
  error: '#FF4136',
};

const initialState: ThemeState = {
  mode: 'dark',
  colors: darkColors,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
      state.colors = state.mode === 'dark' ? darkColors : lightColors;
    },
    setTheme: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
      state.colors = action.payload === 'dark' ? darkColors : lightColors;
    },
  },
});

export type { ThemeColors, ThemeMode };
export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;