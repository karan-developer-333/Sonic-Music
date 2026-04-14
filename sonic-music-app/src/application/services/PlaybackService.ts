import { Platform } from 'react-native';
import { Song } from '../../domain/models/MusicModels';

let Audio: any = null;
let audioElement: HTMLAudioElement | null = null;
let soundInstance: any = null;
let statusCallback: ((status: any) => void) | null = null;

if (Platform.OS !== 'web') {
  try {
    Audio = require('expo-av').Audio;
  } catch (e) {
    console.error('[PlaybackService] Failed to load expo-av:', e);
  }
}

export class PlaybackService {
  private static instance: PlaybackService;

  private constructor() {}

  static getInstance(): PlaybackService {
    if (!this.instance) {
      this.instance = new PlaybackService();
    }
    return this.instance;
  }

  setStatusCallback(callback: (status: any) => void) {
    statusCallback = callback;
  }

  async loadAndPlay(song: Song): Promise<void> {
    console.log(`[PlaybackService] Loading song: ${song.title} (${song.audioUrl})`);
    
    if (Platform.OS === 'web') {
      return this.loadAndPlayWeb(song);
    }

    try {
      if (!Audio) throw new Error('Audio module not loaded');

      // Unload previous sound
      if (soundInstance) {
        console.log('[PlaybackService] Unloading previous sound');
        await soundInstance.unloadAsync();
        soundInstance = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('[PlaybackService] Creating new sound instance');
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.audioUrl },
        { shouldPlay: true },
        this.onPlaybackStatusUpdate
      );

      soundInstance = sound;
    } catch (error) {
      console.error('[PlaybackService] Error loading sound:', error);
      throw error;
    }
  }

  private loadAndPlayWeb(song: Song): void {
    if (audioElement) {
      audioElement.pause();
      audioElement.src = '';
      audioElement = null;
    }

    audioElement = new (window as any).Audio(song.audioUrl);
    if (audioElement) {
      audioElement.ontimeupdate = () => {
        if (statusCallback && audioElement) {
          statusCallback({
            isLoaded: true,
            isPlaying: !audioElement.paused,
            positionMillis: audioElement.currentTime * 1000,
            durationMillis: audioElement.duration * 1000,
          });
        }
      };

      audioElement.onended = () => {
        if (statusCallback) statusCallback({ didJustFinish: true });
      };

      audioElement.play().catch(e => console.error('[PlaybackService] Web play error:', e));
    }
  }

  async togglePlayPause(shouldPlay: boolean): Promise<void> {
    if (Platform.OS === 'web') {
      if (audioElement) {
        if (shouldPlay) await audioElement.play();
        else audioElement.pause();
      }
      return;
    }

    if (soundInstance) {
      if (shouldPlay) await soundInstance.playAsync();
      else await soundInstance.pauseAsync();
    }
  }

  async seekTo(positionMillis: number): Promise<void> {
    if (Platform.OS === 'web') {
      if (audioElement) audioElement.currentTime = positionMillis / 1000;
      return;
    }

    if (soundInstance) {
      await soundInstance.setPositionAsync(positionMillis);
    }
  }

  async stop(): Promise<void> {
    if (Platform.OS === 'web') {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
      }
      return;
    }

    if (soundInstance) {
      await soundInstance.stopAsync();
      await soundInstance.unloadAsync();
      soundInstance = null;
    }
  }

  private onPlaybackStatusUpdate = (status: any) => {
    if (statusCallback) {
      statusCallback(status);
    }
  };
}
