/**
 * QueueProvider - Integration Layer
 * Wraps the app to sync Zustand queue with existing Redux player
 * Provides seamless transition between old and new systems
 */

import React, { useEffect, useRef, createContext, useContext } from 'react';
import { useQueueStore } from '../../application/store/queueStore';
import { PlaybackService } from '../../application/services/PlaybackService';

// Context for queue integration
interface QueueContextValue {
  isReady: boolean;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export const useQueueContext = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueueContext must be used within QueueProvider');
  }
  return context;
};

interface QueueProviderProps {
  children: React.ReactNode;
}

/**
 * QueueProvider Component
 * Synchronizes playback state between Redux and Zustand
 * Handles song completion events and auto-advance
 */
export const QueueProvider: React.FC<QueueProviderProps> = ({ children }) => {
  const isReadyRef = useRef(true);

  useEffect(() => {
    const playbackService = PlaybackService.getInstance();
    
    const callbackId = playbackService.setStatusCallback((status) => {
      const { setPlaybackStatus } = useQueueStore.getState();
      
      if (status.isLoaded) {
        setPlaybackStatus({
          isPlaying: status.isPlaying,
          progress: status.positionMillis / (status.durationMillis || 1),
          currentTime: status.positionMillis / 1000,
          duration: status.durationMillis || 0,
          didJustFinish: status.didJustFinish,
        });
      } else if (status.didJustFinish) {
        setPlaybackStatus({
          isPlaying: false,
          progress: 1,
          currentTime: 0,
          duration: 0,
          didJustFinish: true,
        });
      }
    });

    return () => {
      playbackService.removeStatusCallback(callbackId);
    };
  }, []);

  return (
    <QueueContext.Provider value={{ isReady: isReadyRef.current }}>
      {children}
    </QueueContext.Provider>
  );
};

