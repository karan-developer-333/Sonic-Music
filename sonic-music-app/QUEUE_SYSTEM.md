# 🎵 Up Next Queue System

Advanced queue management system for the Sonic Music App using **Zustand**, **Bottom Sheet**, and **Draggable FlatList**.

---

## 📁 Architecture

```
src/
├── domain/models/QueueItem.ts          # Domain model
├── application/
│   ├── store/queueStore.ts              # Redux store
│   └── hooks/useQueue.ts                # React hooks
├── data/storage/queueStorage.ts         # AsyncStorage persistence
└── presentation/components/
    ├── QueueList.tsx                    # Draggable list component
    ├── UpNextModal.tsx                  # Bottom sheet modal
    └── QueueProvider.tsx                # Context provider
```

---

## 🚀 Features

- **✅ Queue Management**: Add, remove, reorder songs
- **✅ Drag & Drop**: Smooth reordering with react-native-draggable-flatlist
- **✅ Swipe Actions**: Swipe to remove songs
- **✅ Bottom Sheet**: Modern modal UI with @gorhom/bottom-sheet
- **✅ Persistence**: Queue saved to AsyncStorage
- **✅ Repeat & Shuffle**: Playback controls
- **✅ Auto Advance**: Automatically plays next song on completion
- **✅ History**: Tracks previously played songs for skip back

---

## 🔌 Integration

### 1. Wrap your App with Providers

```tsx
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueueProvider } from './src/presentation/components/QueueProvider';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Provider store={store}>
          <QueueProvider>          {/* NEW */}
            <BottomSheetModalProvider>  {/* NEW */}
              <AppContent />
            </BottomSheetModalProvider>
          </QueueProvider>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

### 2. Using the Queue Store

```tsx
import { useQueueStore } from './src/application/store/queueStore';

function MyComponent() {
  const { currentSong, queue, playSong, addToQueue } = useQueueStore();

  // Play a song
  const handlePlay = (song) => {
    playSong({
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.coverUrl,
      streamUrl: song.audioUrl,
      duration: song.duration,
    });
  };

  return (
    // Your JSX
  );
}
```

### 3. Using the useQueue Hook

```tsx
import { useQueue } from './src/application/hooks/useQueue';

function PlayerScreen() {
  const {
    currentSong,
    queue,
    upcomingSongs,
    upNextCount,
    playSong,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    skipNext,
    skipPrevious,
    openUpNext,
  } = useQueue();

  return (
    // Your JSX
  );
}
```

### 4. Opening the Up Next Modal

```tsx
import { UpNextModal } from './src/presentation/components/UpNextModal';

function PlayerScreen() {
  const [isUpNextVisible, setIsUpNextVisible] = useState(false);
  const colors = useAppSelector(selectThemeColors);

  return (
    <>
      <TouchableOpacity onPress={() => setIsUpNextVisible(true)}>
        <Text>Open Queue</Text>
      </TouchableOpacity>

      <UpNextModal
        visible={isUpNextVisible}
        onClose={() => setIsUpNextVisible(false)}
        colors={{
          background: colors.background,
          card: colors.card,
          text: colors.text,
          textMuted: colors.textMuted,
          primary: colors.primary,
          danger: colors.danger,
          glass: colors.glass,
          secondary: colors.secondary,
        }}
      />
    </>
  );
}
```

---

## 📦 API Reference

### QueueState

```typescript
interface QueueState {
  currentSong: QueueItem | null;
  queue: QueueItem[];
  history: QueueItem[];
  isPlaying: boolean;
  repeat: 'none' | 'all' | 'one';
  shuffle: boolean;
  isUpNextVisible: boolean;
  isLoading: boolean;
  error: string | null;
}
```

### QueueActions

```typescript
interface QueueActions {
  // Playback
  playSong: (song: QueueItem | QueueItem[], index?: number) => void;
  togglePlayback: () => void;
  skipNext: () => void;
  skipPrevious: () => void;

  // Queue Management
  addToQueue: (song: QueueItem) => void;
  playNext: (song: QueueItem) => void;
  removeFromQueue: (id: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;

  // Settings
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;

  // UI
  setUpNextVisible: (visible: boolean) => void;
}
```

---

## 🔧 Redux Integration

The queue system works alongside the existing Redux store. The `QueueProvider` synchronizes playback events between both stores.

### Sync Strategy

- **Redux**: Controls the current playback (Expo AV)
- **Zustand (Queue)**: Manages the queue state and upcoming songs

When a song finishes in Redux, the queue automatically advances to the next song in Zustand.

---

## 💾 Persistence

Queue data is automatically persisted to AsyncStorage using Zustand's persist middleware.

```typescript
// Data is saved automatically on changes
useQueueStore.persist(); // Manual save if needed

// Data is restored on app restart
const queueData = await QueueStorage.loadQueue();
```

---

## 🎨 Styling

The QueueList and UpNextModal components accept a `colors` prop for theming:

```typescript
interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textMuted: string;
  primary: string;
  danger: string;
  glass: string;
  secondary: string;
}
```

---

## 📱 Usage Examples

### Add to Queue

```tsx
const { addToQueue } = useQueue();

const handleAddToQueue = (song) => {
  addToQueue({
    id: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail: song.coverUrl,
    streamUrl: song.audioUrl,
  });
};
```

### Play Next

```tsx
const { playNext } = useQueue();

const handlePlayNext = (song) => {
  playNext({
    id: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail: song.coverUrl,
    streamUrl: song.audioUrl,
  });
};
```

### Reorder Queue

```tsx
const { reorderQueue } = useQueue();

// Swap positions 0 and 1
reorderQueue(0, 1);
```

---

## ⚡ Performance

- **Memoized Selectors**: Components only re-render when relevant state changes
- **FlatList Optimization**: Uses react-native-draggable-flatlist with proper key extraction
- **Zustand Selectors**: Fine-grained subscriptions prevent unnecessary renders
- **AsyncStorage**: Non-blocking persistence with debounced saves

---

## 🧪 Testing

```tsx
import { QueueStorage } from './src/data/storage/queueStorage';

// Clear queue before tests
beforeEach(async () => {
  await QueueStorage.clearQueue();
});

// Mock the store
const mockQueueStore = {
  currentSong: null,
  queue: [],
  playSong: jest.fn(),
  addToQueue: jest.fn(),
};
```

---

## 🎵 Expo AV Integration

The queue system integrates with Expo AV through the `PlaybackService`:

```typescript
// PlaybackService callback
playbackService.setStatusCallback((status) => {
  if (status.didJustFinish) {
    // Auto-advance to next song
    queueStore.skipNext();
  }
});
```

---

## 📋 Dependencies

```json
{
  "zustand": "^4.x",
  "@gorhom/bottom-sheet": "^4.x",
  "react-native-draggable-flatlist": "^4.x",
  "react-native-swipeable-item": "^2.x"
}
```

---

## 🚀 Future Enhancements

- [ ] Queue from playlists/albums
- [ ] Share queue feature
- [ ] Smart queue recommendations
- [ ] Cross-fade between songs
- [ ] Sleep timer integration

---

## 📄 License

MIT License - Sonic Music App
