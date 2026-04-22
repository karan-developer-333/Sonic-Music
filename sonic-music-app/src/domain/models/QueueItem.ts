/**
 * QueueItem - Domain model representing a song in the playback queue
 * Follows Clean Architecture principles - pure data structure with no dependencies
 */

export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  streamUrl: string;
  duration?: number;
  source?: 'gaana' | 'saavn';
  addedAt?: string;
  addedBy?: 'user' | 'auto';
}

/**
 * Creates a QueueItem from a Song object
 * Provides a factory function for consistent conversion
 */
export const createQueueItem = (song: {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration?: number;
  source?: 'gaana' | 'saavn';
}): QueueItem => ({
  id: song.id,
  title: song.title,
  artist: song.artist,
  thumbnail: song.coverUrl,
  streamUrl: song.audioUrl,
  duration: song.duration,
  source: song.source,
  addedAt: new Date().toISOString(),
  addedBy: 'user',
});

/**
 * Converts QueueItem back to Song format for existing components
 */
export const queueItemToSong = (item: QueueItem): {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  duration: number;
  source: 'gaana' | 'saavn';
} => ({
  id: item.id,
  title: item.title,
  artist: item.artist,
  coverUrl: item.thumbnail,
  audioUrl: item.streamUrl,
  duration: item.duration || 0,
  source: item.source || 'saavn',
});
