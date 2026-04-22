/**
 * Queue Storage - Data Layer
 * Handles persistence of queue using AsyncStorage
 * Follows Clean Architecture: implements storage without knowing about business logic
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueueItem } from '../../domain/models/QueueItem';

const QUEUE_STORAGE_KEY = '@sonic_queue_data_v1';

interface QueueStorageData {
  queue: QueueItem[];
  currentSong: QueueItem | null;
  isPlaying: boolean;
  lastUpdated: string;
  version: number;
}

const CURRENT_VERSION = 1;

export class QueueStorage {
  /**
   * Save queue data to AsyncStorage
   */
  static async saveQueue(
    queue: QueueItem[],
    currentSong: QueueItem | null,
    isPlaying: boolean
  ): Promise<void> {
    try {
      const data: QueueStorageData = {
        queue,
        currentSong,
        isPlaying,
        lastUpdated: new Date().toISOString(),
        version: CURRENT_VERSION,
      };

      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('[QueueStorage] Failed to save queue:', error);
      throw new Error('Failed to save queue to storage');
    }
  }

  /**
   * Load queue data from AsyncStorage
   */
  static async loadQueue(): Promise<{
    queue: QueueItem[];
    currentSong: QueueItem | null;
    isPlaying: boolean;
  } | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      
      if (!jsonValue) {
        return null;
      }

      const data: QueueStorageData = JSON.parse(jsonValue);

      // Check version for migration needs
      if (data.version !== CURRENT_VERSION) {
        console.warn('[QueueStorage] Queue data version mismatch, may need migration');
      }

      return {
        queue: data.queue || [],
        currentSong: data.currentSong || null,
        isPlaying: data.isPlaying || false,
      };
    } catch (error) {
      console.error('[QueueStorage] Failed to load queue:', error);
      return null;
    }
  }

  /**
   * Clear queue data from AsyncStorage
   */
  static async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (error) {
      console.error('[QueueStorage] Failed to clear queue:', error);
      throw new Error('Failed to clear queue storage');
    }
  }

  /**
   * Export queue data (useful for sharing or backup)
   */
  static async exportQueue(): Promise<string | null> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      return data;
    } catch (error) {
      console.error('[QueueStorage] Failed to export queue:', error);
      return null;
    }
  }

  /**
   * Import queue data (useful for restoring from backup)
   */
  static async importQueue(jsonData: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonData);
      
      // Basic validation
      if (data.version && Array.isArray(data.queue)) {
        await AsyncStorage.setItem(QUEUE_STORAGE_KEY, jsonData);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[QueueStorage] Failed to import queue:', error);
      return false;
    }
  }
}
