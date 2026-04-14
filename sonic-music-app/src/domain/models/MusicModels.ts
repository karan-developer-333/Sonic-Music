export interface Song {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  categoryId?: string;
  source?: 'gaana';
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  artwork?: string;
  source?: 'gaana';
  type: 'album';
  releaseDate?: string;
  genre?: string;
  language?: string;
  songCount?: number;
  tracks?: Song[];
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
