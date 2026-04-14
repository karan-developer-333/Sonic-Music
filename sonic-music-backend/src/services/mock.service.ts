import type { NormalizedSong } from '../types/music';
import { logger } from '../utils/logger';

export const MOCK_SONGS: NormalizedSong[] = [
  { id: 'sp_1', title: 'Summer Vibes', artist: 'DJ Studio', thumbnail: 'https://picsum.photos/300/300?random=1', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', source: 'spotify' },
  { id: 'sp_2', title: 'Night Drive', artist: 'Midnight Beats', thumbnail: 'https://picsum.photos/300/300?random=2', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', source: 'spotify' },
  { id: 'sp_3', title: 'Chill Wave', artist: 'LoFi Masters', thumbnail: 'https://picsum.photos/300/300?random=3', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', source: 'spotify' },
  { id: 'sp_4', title: 'Electric Dreams', artist: 'Synth Hero', thumbnail: 'https://picsum.photos/300/300?random=4', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', source: 'spotify' },
  { id: 'jm_1', title: 'Acoustic Sunrise', artist: 'Guitar Stories', thumbnail: 'https://picsum.photos/300/300?random=5', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', source: 'jamendo' },
  { id: 'jm_2', title: 'Jazz Café', artist: 'Smooth Quartet', thumbnail: 'https://picsum.photos/300/300?random=6', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', source: 'jamendo' },
  { id: 'sp_5', title: 'Hip Hop Flow', artist: 'Street Beats', thumbnail: 'https://picsum.photos/300/300?random=7', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', source: 'spotify' },
  { id: 'sp_6', title: 'Deep House Mix', artist: 'Club Kings', thumbnail: 'https://picsum.photos/300/300?random=8', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', source: 'spotify' },
  { id: 'jm_3', title: 'Classical Meditation', artist: 'Orchestra Divine', thumbnail: 'https://picsum.photos/300/300?random=9', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', source: 'jamendo' },
  { id: 'sp_7', title: 'Trap Nation', artist: 'Bass Drop', thumbnail: 'https://picsum.photos/300/300?random=10', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', source: 'spotify' },
  { id: 'sp_8', title: 'Indie Rock Anthem', artist: 'The Wanderers', thumbnail: 'https://picsum.photos/300/300?random=11', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', source: 'spotify' },
  { id: 'jm_4', title: 'World Music Journey', artist: 'Global Sounds', thumbnail: 'https://picsum.photos/300/300?random=12', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', source: 'jamendo' },
  { id: 'sp_9', title: 'R&B Slow Jams', artist: 'Soulful Voice', thumbnail: 'https://picsum.photos/300/300?random=13', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', source: 'spotify' },
  { id: 'sp_10', title: 'Techno Marathon', artist: 'DJ Pulse', thumbnail: 'https://picsum.photos/300/300?random=14', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', source: 'spotify' },
  { id: 'jm_5', title: 'Folk Tales', artist: 'Mountain Strings', thumbnail: 'https://picsum.photos/300/300?random=15', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', source: 'jamendo' },
  { id: 'sp_11', title: 'Reggae Vibes', artist: 'Island Rhythm', thumbnail: 'https://picsum.photos/300/300?random=16', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', source: 'spotify' },
  { id: 'sp_12', title: 'Ambient Soundscape', artist: 'Chill Factory', thumbnail: 'https://picsum.photos/300/300?random=17', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', source: 'spotify' },
  { id: 'jm_6', title: 'Electronic Pulse', artist: 'Synth Wave', thumbnail: 'https://picsum.photos/300/300?random=18', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', source: 'jamendo' },
  { id: 'sp_13', title: 'Latin Heat', artist: 'Salsa Kings', thumbnail: 'https://picsum.photos/300/300?random=19', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', source: 'spotify' },
  { id: 'sp_14', title: 'Future Bass', artist: 'Neon Generation', thumbnail: 'https://picsum.photos/300/300?random=20', streamUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', source: 'spotify' },
];

export function getMockTrending(): NormalizedSong[] {
  logger.info('Using mock trending data');
  return MOCK_SONGS.slice(0, 20);
}

export function searchMockSongs(query: string): NormalizedSong[] {
  const lowerQuery = query.toLowerCase();
  const results = MOCK_SONGS.filter(
    (song) =>
      song.title.toLowerCase().includes(lowerQuery) ||
      song.artist.toLowerCase().includes(lowerQuery)
  );
  logger.info('Mock search results', { query, count: results.length });
  return results;
}

export function getMockSong(id: string): NormalizedSong | null {
  return MOCK_SONGS.find((song) => song.id === id) || null;
}

export function getMockStreamUrl(id: string): string | null {
  const song = getMockSong(id);
  return song?.streamUrl || null;
}