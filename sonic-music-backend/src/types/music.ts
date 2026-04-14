export type MusicSource = 'spotify' | 'jamendo';

export interface NormalizedSong {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl: string;
  source: MusicSource;
}

export interface TrendingResponse {
  songs: NormalizedSong[];
  cached: boolean;
  timestamp: number;
  authenticated?: boolean;
}

export interface SearchResponse {
  songs: NormalizedSong[];
  query: string;
  cached: boolean;
  total: number;
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