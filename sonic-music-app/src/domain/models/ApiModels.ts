export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SongResponse {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  categoryId: string;
  categoryName?: string;
  playCount?: number;
  liked?: boolean;
  createdAt?: string;
}

export interface CategoryResponse {
  id: string;
  name: string;
  coverUrl?: string;
  songCount?: number;
}

export interface PlaylistResponse {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  songs: SongResponse[];
  songCount: number;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ArtistResponse {
  id: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  songCount?: number;
  followerCount?: number;
}

export interface SearchResponse {
  songs: SongResponse[];
  artists: ArtistResponse[];
  playlists: PlaylistResponse[];
}

export interface UserProfileResponse {
  id: string;
  username: string;
  email: string;
  avatarUrl: string;
  playlists: PlaylistResponse[];
  likedSongs: SongResponse[];
  recentlyPlayed: SongResponse[];
}
