import apiClient, { setAuthToken, clearAuthToken } from './ApiClient';


export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

class AuthService {
  private static token: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
    if (token) {
      setAuthToken(token);
    } else {
      clearAuthToken();
    }

  }

  static getToken(): string | null {
    return this.token;
  }

  static async register(
    email: string,
    password: string,
    name?: string
  ): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      name,
    });
    this.setToken(response.data.token);
    return response.data;
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    this.setToken(response.data.token);
    return response.data;
  }

  static async getCurrentUser(): Promise<AuthUser> {
    const response = await apiClient.get<{ user: AuthUser }>('/auth/me');
    return response.data.user;
  }

  static async logout(): Promise<void> {
    this.setToken(null);
  }

  static async saveAlbum(
    albumId: string,
    title: string,
    artist: string,
    coverUrl?: string
  ): Promise<void> {
    await apiClient.post('/saved-albums', {
      albumId,
      title,
      artist,
      coverUrl,
      source: 'gaana',
    });
  }

  static async removeSavedAlbum(albumId: string): Promise<void> {
    await apiClient.delete(`/saved-albums/${albumId}`);
  }

  static async getSavedAlbums(): Promise<any[]> {
    const response = await apiClient.get<{ albums: any[] }>('/saved-albums');
    return response.data.albums;
  }

  static async addToHistory(
    songId: string,
    songTitle: string,
    artist: string,
    coverUrl?: string,
    duration?: number
  ): Promise<void> {
    try {
      await apiClient.post('/history', {
        songId,
        songTitle,
        artist,
        coverUrl,
        duration: duration || 0,
        source: 'gaana',
      });
    } catch (error) {
      // Silently fail for history tracking
    }
  }
 
  static async getHistory(limit = 50): Promise<any[]> {
    const response = await apiClient.get<{ history: any[] }>(`/history?limit=${limit}`);
    return response.data.history;
  }

  static clearCache() {
    // Implement cache clearing logic if needed
    console.log('Cache cleared');
  }
}


export default AuthService;
