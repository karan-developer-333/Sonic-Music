import { Platform } from 'react-native';
import { Song } from '../../domain/models/MusicModels';

let Audio: any = null;
let audioElement: HTMLAudioElement | null = null;
let soundInstance: any = null;
let callbackIdCounter = 0;
const callbacks = new Map<number, (status: any) => void>();
const webCallbacks = new Map<number, () => void>();

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

  setStatusCallback(callback: (status: any) => void): number {
    const id = ++callbackIdCounter;
    callbacks.set(id, callback);
    return id;
  }

  removeStatusCallback(callbackId: number): void {
    callbacks.delete(callbackId);
    webCallbacks.delete(callbackId);
  }

  private notifyCallbacks(status: any): void {
    callbacks.forEach((callback) => {
      try {
        callback(status);
      } catch (e) {
        console.error('[PlaybackService] Callback error:', e);
      }
    });
  }

  async loadAndPlay(song: Song): Promise<void> {
    console.log(`[PlaybackService] Loading song: ${song.title} (${song.audioUrl})`);
    
    if (Platform.OS === 'web') {
      return this.loadAndPlayWeb(song);
    }

    try {
      if (!Audio) throw new Error('Audio module not loaded');

      if (soundInstance) {
        console.log('[PlaybackService] Unloading previous sound');
        try {
          await soundInstance.unloadAsync();
        } catch (e) {
          console.log('[PlaybackService] Previous sound already unloaded');
        }
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
        this.onPlaybackStatusUpdate.bind(this)
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
      const timeUpdateHandler = () => {
        if (audioElement) {
          this.notifyCallbacks({
            isLoaded: true,
            isPlaying: !audioElement.paused,
            positionMillis: audioElement.currentTime * 1000,
            durationMillis: (audioElement.duration || 0) * 1000,
          });
        }
      };

      const endedHandler = () => {
        this.notifyCallbacks({ didJustFinish: true });
      };

      audioElement.ontimeupdate = timeUpdateHandler;
      audioElement.onended = endedHandler;

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
      try {
        await soundInstance.stopAsync();
        await soundInstance.unloadAsync();
      } catch (e) {
        console.log('[PlaybackService] Error stopping sound:', e);
      }
      soundInstance = null;
    }
  }

  private onPlaybackStatusUpdate = (status: any) => {
    this.notifyCallbacks(status);
  };
}
