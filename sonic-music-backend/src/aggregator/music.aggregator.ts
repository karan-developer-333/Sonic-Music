import type { NormalizedSong } from '../types/music';
import { logger } from '../utils/logger';

function createSongHash(song: NormalizedSong): string {
  const normalizedTitle = song.title.toLowerCase().trim();
  const normalizedArtist = song.artist.toLowerCase().trim();
  return `${normalizedArtist}:${normalizedTitle}`;
}

export function deduplicateSongs(songs: NormalizedSong[]): NormalizedSong[] {
  const seen = new Set<string>();
  const unique: NormalizedSong[] = [];

  for (const song of songs) {
    const hash = createSongHash(song);
    if (!seen.has(hash)) {
      seen.add(hash);
      unique.push(song);
    }
  }

  logger.debug('Deduplication stats', {
    original: songs.length,
    unique: unique.length,
  });

  return unique;
}

export function rankResults(songs: NormalizedSong[], query: string): NormalizedSong[] {
  const queryLower = query.toLowerCase();
  
  const scored = songs.map((song) => {
    let score = 0;
    const title = song.title.toLowerCase();
    const artist = song.artist.toLowerCase();

    if (title.includes(queryLower)) score += 10;
    if (artist.includes(queryLower)) score += 5;
    if (title.startsWith(queryLower)) score += 3;
    if (artist.startsWith(queryLower)) score += 2;

    return { song, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.song);
}

export function aggregateResults(
  results: NormalizedSong[],
  query?: string
): NormalizedSong[] {
  const deduped = deduplicateSongs(results);
  
  if (query) {
    return rankResults(deduped, query);
  }
  
  return deduped;
}