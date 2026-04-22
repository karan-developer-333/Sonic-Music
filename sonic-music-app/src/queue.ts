/**
 * Queue Module - Exports
 * Clean Architecture compliant exports for the Queue feature
 */

// Domain
export { QueueItem, createQueueItem, queueItemToSong } from './domain/models/QueueItem';

// Application
export { useQueueStore } from './application/store/queueStore';
export type { RepeatMode } from './application/store/queueStore';
export { useQueue, useQueueState, useQueueActions } from './application/hooks/useQueue';

// Data
export { QueueStorage } from './data/storage/queueStorage';

// Presentation
export { QueueList } from './presentation/components/QueueList';
export { UpNextModal } from './presentation/components/UpNextModal';
export { QueueProvider } from './presentation/components/QueueProvider';
