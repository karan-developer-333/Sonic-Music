import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { withTimeout } from '../utils/timeout';
import type { NormalizedSong, ServiceResponse } from '../types/music';

const BASE_URL = 'https://www.jiosaavn.com/api.php';

interface SaavnTrack {
  id: string;
  song: string;
  singers: string;
  image: string;
  media_url?: string;
  encrypted_media_url?: string;
  album: string;
  duration?: string;
  year?: string;
}

function decryptSaavnUrl(encryptedUrl: string) {
  try {
    const key = '3834363538353335';
    const decipher = crypto.createDecipheriv('des-ecb', key, '');
    decipher.setAutoPadding(true);
    
    let decrypted = decipher.update(encryptedUrl, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    // Replace bitrate to get high quality (320kbps)
    return decrypted.replace('_96.mp4', '_320.mp4').replace('_160.mp4', '_320.mp4').replace('_96.aac', '_320.mp4').replace('_160.aac', '_320.mp4');
  } catch (err) {
    logger.error('Saavn URL decryption failed', { error: (err as Error).message });
    return '';
  }
}

function normalizeTrack(track: SaavnTrack): NormalizedSong {
  // Clean up image URL if it's the tiny one
  const thumbnail = track.image.replace('150x150', '500x500');
  
  let streamUrl = track.media_url || '';
  if (track.encrypted_media_url) {
    streamUrl = decryptSaavnUrl(track.encrypted_media_url);
  }
  
  return {
    id: `sv_${track.id}`,
    title: track.song || 'Unknown Title',
    artist: track.singers || 'Unknown Artist',
    thumbnail: thumbnail,
    streamUrl: streamUrl,
    source: 'saavn',
  };
}

export async function getSaavnTrending(): Promise<ServiceResponse<NormalizedSong[]>> {
  try {
    const response = await withTimeout(
      axios.get(BASE_URL, {
        params: {
          __call: 'content.getTrending',
          _format: 'json',
          _marker: '0',
          ctx: 'web6dot0',
        },
      }),
      Number(process.env.API_TIMEOUT) || 7000,
      'Saavn API timeout'
    );

    let tracks: SaavnTrack[] = [];

    if (Array.isArray(response.data)) {
      // Filter for songs if types are mixed
      tracks = response.data
        .filter((item: any) => item.type === 'song')
        .map((item: any) => item.details || item);
    } else if (response.data && typeof response.data === 'object') {
       tracks = response.data.songs || [];
    }

    if (!tracks.length) {
      logger.warn('No trending songs found from Saavn');
      return { data: [], source: 'saavn' };
    }

    return {
      data: tracks.map(normalizeTrack),
      source: 'saavn',
    };
  } catch (err) {
    logger.error('Saavn API error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to fetch trending from Saavn', source: 'saavn' };
  }
}

export async function searchSaavn(query: string): Promise<ServiceResponse<NormalizedSong[]>> {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        __call: 'search.getResults',
        _format: 'json',
        _marker: '0',
        ctx: 'web6dot0',
        q: query,
      },
    });

    const tracks = response.data.results || [];

    return {
      data: tracks.map(normalizeTrack),
      source: 'saavn',
    };
  } catch (err) {
    logger.error('Saavn search error', {
      error: (err as Error).message,
    });
    return { error: 'Failed to search Saavn', source: 'saavn' };
  }
}
