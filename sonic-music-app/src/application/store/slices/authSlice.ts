import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  display_name: string;
  email: string;
  images: { url: string }[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  sessionId: string | null;
  isAuthenticated: boolean;
  isVerified: boolean;
  isLoading: boolean;
  error: string | null;
  verificationError: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  sessionId: null,
  isAuthenticated: false,
  isVerified: true, // Default to true until check fails
  isLoading: false,
  error: null,
  verificationError: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess: (state, action: PayloadAction<{
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
      sessionId: string;
      user?: User;
      isVerified?: boolean;
    }>) => {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.expiresAt = action.payload.expiresAt;
      state.sessionId = action.payload.sessionId;
      state.isVerified = action.payload.isVerified !== undefined ? action.payload.isVerified : true;
      state.verificationError = null;
      if (action.payload.user) {
        state.user = action.payload.user;
      }
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.expiresAt = null;
      state.sessionId = null;
      state.isAuthenticated = false;
      state.isVerified = true;
      state.error = null;
      state.verificationError = null;
    },
    updateUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
    setVerification: (state, action: PayloadAction<{ isVerified: boolean; error?: string }>) => {
      state.isVerified = action.payload.isVerified;
      state.verificationError = action.payload.error || null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateUser, setVerification } = authSlice.actions;
export default authSlice.reducer;
