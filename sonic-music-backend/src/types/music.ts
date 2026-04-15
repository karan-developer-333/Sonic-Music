export type MusicSource = 'gaana' | 'saavn';

export type SearchType = 'all' | 'songs' | 'albums' | 'artists' | 'playlists';

export interface ImageUrl {
  quality: '50x50' | '150x150' | '500x500';
  url: string;
}

export interface StreamUrl {
  quality: 'low' | 'medium' | 'high' | 'veryhigh';
  url: string;
}

export interface NormalizedArtist {
  id: string;
  name: string;
  image?: string;
  thumbnail?: string;
  languages?: string[];
  bio?: string;
  followerCount?: number;
  source: MusicSource;
}

export interface NormalizedAlbum {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  thumbnail?: string;
  coverUrl?: string;
  artwork?: string;
  year?: string;
  releaseDate?: string;
  language?: string;
  genre?: string;
  songCount?: number;
  description?: string;
  url?: string;
  source: MusicSource;
}

export interface NormalizedPlaylist {
  id: string;
  title: string;
  subtitle?: string;
  thumbnail?: string;
  coverUrl?: string;
  image?: string;
  songCount?: number;
  username?: string;
  firstname?: string;
  lastname?: string;
  language?: string;
  source: MusicSource;
}

export interface NormalizedSong {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: {
    id: string;
    name: string;
    url?: string;
  };
  thumbnails: ImageUrl[];
  thumbnail: string; // Default thumbnail for backward compatibility
  streamUrl: string; // Default high quality stream URL
  streamUrls: StreamUrl[];
  duration?: number;
  releaseDate?: string;
  language?: string;
  year?: string;
  lyrics?: string;
  playCount?: number;
  copyright?: string;
  label?: string;
  source: MusicSource;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  hasMore: boolean;
}

export interface TrendingResponse extends PaginatedResponse<NormalizedSong> {
  cached: boolean;
  timestamp: number;
}

export interface SearchResponse extends PaginatedResponse<NormalizedSong> {
  query: string;
  cached: boolean;
}

export interface SongResponse {
  song: NormalizedSong;
}

export interface StreamResponse {
  streamUrl: string;
  source: MusicSource;
}

export interface ServiceResponse<T> {
  data?: T;
  error?: string;
  source: MusicSource;
}

export interface HomeDataResponse {
  popularSongs: NormalizedSong[];
  trendingSongs: NormalizedSong[];
  newReleases: NormalizedSong[];
  topCharts: NormalizedSong[];
  romanticHindi: NormalizedSong[];
  popularAlbums: NormalizedAlbum[];
  cached: boolean;
  timestamp: number;
}

export interface ExploreDataResponse extends PaginatedResponse<NormalizedSong | NormalizedAlbum> {
  type: 'songs' | 'albums';
  language: string;
  cached: boolean;
}

export interface SearchDataResponse {
  songs: NormalizedSong[];
  albums: NormalizedAlbum[];
  artists: NormalizedArtist[];
  playlists: NormalizedPlaylist[];
  query: string;
  cached: boolean;
}

export interface ArtistDetailResponse {
  artist: NormalizedArtist;
  topSongs: NormalizedSong[];
  popularAlbums: NormalizedAlbum[];
  similarArtists: NormalizedArtist[];
  cached: boolean;
}

export interface AlbumDetailResponse {
  album: NormalizedAlbum;
  songs: NormalizedSong[];
  cached: boolean;
}