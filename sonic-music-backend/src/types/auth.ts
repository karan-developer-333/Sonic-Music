export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface SpotifyUser {
  id: string;
  display_name: string;
  email?: string;
  images?: { url: string }[];
}

export interface Session {
  userId: string;
  tokens: SpotifyTokens;
  user?: SpotifyUser;
  createdAt: number;
}

export interface AuthResponse {
  success: boolean;
  user?: SpotifyUser;
  message?: string;
}
