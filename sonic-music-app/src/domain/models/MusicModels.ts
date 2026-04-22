export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  thumbnail?: string;
  streamUrl?: string;
  categoryId?: string;
  source?: 'gaana' | 'saavn';
  favoritedAt?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  artwork?: string;
  source?: 'gaana' | 'saavn';
  type: 'album';
  releaseDate?: string;
  year?: string;
  genre?: string;
  language?: string;
  songCount?: number;
  tracks?: Song[];
}

export interface Artist {
  id: string;
  name: string;
  image: string;
  thumbnail?: string;
  bio?: string;
  followerCount?: number;
  languages?: string[];
  isVerified?: boolean;
  source?: 'saavn';
}

export interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  type?: 'language' | 'genre' | 'mood';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
