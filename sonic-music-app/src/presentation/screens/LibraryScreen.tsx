import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Modal, 
  TextInput,
  Alert,
  ScrollView,
  RefreshControl, 
  Platform,
  PermissionsAndroid,
  Dimensions,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, selectPlaylistById } from '../../application/store/slices/playlistSlice';
import { MiniPlayer } from '../components/MiniPlayer';
import { SongListItem } from '../components/SongListItem';
import { SongListItemSkeleton } from '../components/LoadingState';
import { ErrorState, EmptyState } from '../components/ErrorState';
import { MediaService } from '../../data/services/MediaService';
import apiClient from '../../data/services/ApiClient';
import { Song, Album } from '../../domain/models/MusicModels';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';

const { width } = Dimensions.get('window');
const ALBUM_CARD_WIDTH = (width - SPACING.lg * 3) / 2;

type LibraryTab = 'playlists' | 'liked' | 'local' | 'saved';

import { useQueue } from '../../application/hooks/useQueue';
import { createQueueItem } from '../../domain/models/QueueItem';

export const LibraryScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('playlists');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const [localSongs, setLocalSongs] = useState<Song[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [savedAlbums, setSavedAlbums] = useState<Album[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);

  const playlists = useAppSelector(state => state.playlist.playlists);
  const colors = useAppSelector(state => state.theme.colors);
  
  // Zustand State
  const { currentSong, playSong: playZustandSong } = useQueue();
  const dispatch = useAppDispatch();

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
          {
            title: 'Audio Permission',
            message: 'App needs access to your audio files',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return true;
  }, []);

  const fetchLocalSongs = useCallback(async (refresh = false) => {
    if (Platform.OS === 'web') {
      setLocalSongs([]);
      setLoadingLocal(false);
      return;
    }

    if (refresh) setRefreshing(true);
    else setLoadingLocal(true);
    setLocalError(null);

    try {
      const hasPerm = await requestPermissions();
      if (!hasPerm) {
        setLocalError('Permission denied');
        setLoadingLocal(false);
        setRefreshing(false);
        return;
      }
      const songs = await MediaService.getLocalSongs();
      setLocalSongs(songs);
    } catch (error) {
      setLocalError('Failed to load local songs');
    } finally {
      setLoadingLocal(false);
      setRefreshing(false);
    }
  }, [requestPermissions]);

  const fetchSavedAlbums = useCallback(async () => {
    try {
      setLoadingSaved(true);
      setSavedError(null);
      const response = await apiClient.get<{ albums: any[] }>('/saved-albums');
      setSavedAlbums(response.data.albums.map((a: any) => ({
        id: a.id,
        title: a.title,
        artist: a.artist,
        coverUrl: a.coverUrl,
        source: a.source,
        type: 'album' as const,
      })));
    } catch (err) {
      setSavedError('Failed to load saved albums');
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    fetchLocalSongs();
    if (activeTab === 'saved') {
      fetchSavedAlbums();
    }
  }, [fetchLocalSongs, activeTab, fetchSavedAlbums]);

  const handleCreatePlaylist = () => {
    if (newPlaylistName.trim()) {
      dispatch(createPlaylist(newPlaylistName.trim()));
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const handleDeletePlaylist = (id: string, name: string) => {
    Alert.alert('Delete Playlist', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePlaylist(id)) },
    ]);
  };

  const handlePlaySong = (song: Song, context?: Song[]) => {
    const queueToUse = context || localSongs;
    const queueItems = queueToUse.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.thumbnail || s.coverUrl,
      audioUrl: s.streamUrl || s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    const startIndex = queueItems.findIndex(item => item.id === song.id);
    playZustandSong(queueItems, startIndex >= 0 ? startIndex : 0);
  };

  const handlePlayAllLocal = () => {
    if (localSongs.length === 0) return;
    
    const queueItems = localSongs.map(s => createQueueItem({
      id: s.id,
      title: s.title,
      artist: s.artist,
      coverUrl: s.thumbnail || s.coverUrl,
      audioUrl: s.streamUrl || s.audioUrl,
      duration: s.duration,
      source: s.source,
    }));
    
    playZustandSong(queueItems, 0);
  };
  const handleMiniPlayerPress = () => navigation.navigate('Player');
  const likedPlaylist = playlists.find((p) => p.id === 'liked');

  const renderLocalContent = () => {
    if (loadingLocal) {
      return (
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map((i) => <SongListItemSkeleton key={i} />)}
        </View>
      );
    }
    if (localError) {
      return <ErrorState message={localError} onRetry={() => fetchLocalSongs(true)} />;
    }
    if (localSongs.length === 0) {
      return (
        <EmptyState
          title="No Local Songs"
          message="Add music files to your device"
          icon={<Ionicons name="phone-portrait" size={32} color={colors.textMuted} />}
        />
      );
    }
    return (
      <>
        <View style={styles.localHeader}>
          <Text style={[styles.localSongCount, { color: colors.textMuted }]}>{localSongs.length} songs on device</Text>
          <TouchableOpacity style={[styles.playAllButton, { backgroundColor: colors.primary }]} onPress={handlePlayAllLocal}>
            <Text style={[styles.playAllText, { color: colors.background }]}>Play All</Text>
          </TouchableOpacity>
        </View>
        {localSongs.map((song, index) => (
          <SongListItem
            key={song.id}
            song={song}
            onPress={handlePlaySong}
            showCover
            showDuration
            showActions
            isCurrentSong={currentSong?.id === song.id}
            index={index}
          />
        ))}
      </>
    );
  };

  const renderPlaylistsContent = () => (
    <>
      <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
        <Ionicons name="add" size={24} color={colors.primary} />
        <Text style={[styles.createButtonText, { color: colors.primary }]}>Create Playlist</Text>
      </TouchableOpacity>
      {playlists.map((playlist) => (
        <TouchableOpacity
          key={playlist.id}
          style={[styles.playlistItem, { backgroundColor: colors.card }]}
          onPress={() => navigation.navigate('PlaylistDetail', { playlistId: playlist.id })}
        >
          <Image source={{ uri: playlist.coverUrl || 'https://images.unsplash.com/photo-1459749411177-042180ce673c' }} style={styles.playlistImage} />
          <View style={styles.playlistInfo}>
            <Text style={[styles.playlistName, { color: colors.text }]} numberOfLines={1}>{playlist.name}</Text>
            <Text style={[styles.playlistCount, { color: colors.textMuted }]}>{playlist.songs.length} songs</Text>
          </View>
          {playlist.id !== 'liked' && (
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeletePlaylist(playlist.id, playlist.name)}>
              <Ionicons name="trash" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      ))}
    </>
  );

  const renderLikedContent = () => {
    const songs = likedPlaylist?.songs || [];
    if (songs.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No liked songs yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Tap heart on songs to add them here</Text>
        </View>
      );
    }
    return songs.map((song) => (
      <SongListItem
        key={song.id}
        song={song}
        onPress={(s) => handlePlaySong(s, songs)}
        showCover
        showActions={false}
        isCurrentSong={currentSong?.id === song.id}
      />
    ));
  };

  const renderSavedContent = () => {
    if (loadingSaved) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={32} color={colors.primary} />
        </View>
      );
    }
    if (savedError) {
      return <ErrorState message={savedError} onRetry={fetchSavedAlbums} />;
    }
    if (savedAlbums.length === 0) {
      return (
        <EmptyState
          title="No Saved Albums"
          message="Save albums from Explore to see them here"
          icon={<Feather name="bookmark" size={32} color={colors.textMuted} />}
        />
      );
    }
    return (
      <View style={styles.albumsGrid}>
        {savedAlbums.map((album) => (
          <TouchableOpacity
            key={album.id}
            style={styles.albumCard}
            onPress={() => navigation.navigate('AlbumDetail', { albumId: album.id, title: album.title })}
          >
            <Image source={{ uri: album.coverUrl }} style={styles.albumImage} />
            <Text style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1}>{album.title}</Text>
            <Text style={[styles.albumArtist, { color: colors.textMuted }]} numberOfLines={1}>{album.artist}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'local': return renderLocalContent();
      case 'playlists': return renderPlaylistsContent();
      case 'liked': return renderLikedContent();
      case 'saved': return renderSavedContent();
      default: return null;
    }
  };

  return (
    <SafeContainer style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLocalSongs(true)} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Your Library</Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, { backgroundColor: activeTab === 'local' ? colors.primary : colors.secondary }]} onPress={() => setActiveTab('local')}>
            <Ionicons name="musical-notes" size={18} color={activeTab === 'local' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'local' ? colors.background : colors.textMuted }]}>Device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { backgroundColor: activeTab === 'playlists' ? colors.primary : colors.secondary }]} onPress={() => setActiveTab('playlists')}>
            <Ionicons name="musical-note" size={18} color={activeTab === 'playlists' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'playlists' ? colors.background : colors.textMuted }]}>Playlists</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { backgroundColor: activeTab === 'liked' ? colors.primary : colors.secondary }]} onPress={() => setActiveTab('liked')}>
            <Ionicons name="heart" size={18} color={activeTab === 'liked' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'liked' ? colors.background : colors.textMuted }]}>Liked</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { backgroundColor: activeTab === 'saved' ? colors.primary : colors.secondary }]} onPress={() => setActiveTab('saved')}>
            <Ionicons name="disc" size={18} color={activeTab === 'saved' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'saved' ? colors.background : colors.textMuted }]}>Albums</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>{renderContent()}</View>
        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal visible={showCreateModal} transparent animationType="fade" onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Playlist</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.secondary, color: colors.text }]}
              placeholder="Playlist name"
              placeholderTextColor={colors.textMuted}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButton} onPress={() => { setShowCreateModal(false); setNewPlaylistName(''); }}>
                <Text style={[styles.modalButtonText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.primary }]} onPress={handleCreatePlaylist}>
                <Text style={[styles.modalButtonTextPrimary, { color: colors.background }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg, gap: SPACING.sm },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: SIZES.radius, gap: SPACING.xs },
  tabText: { fontSize: 13, fontWeight: '600' },
  content: { paddingHorizontal: SPACING.lg },
  createButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, gap: SPACING.md },
  createButtonText: { fontSize: 16, fontWeight: '600' },
  playlistItem: { flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.radius, marginBottom: SPACING.md, padding: SPACING.md },
  playlistImage: { width: 60, height: 60, borderRadius: 8 },
  playlistInfo: { flex: 1, marginLeft: SPACING.md },
  playlistName: { fontSize: 16, fontWeight: '600' },
  playlistCount: { fontSize: 14, marginTop: 2 },
  deleteButton: { padding: SPACING.sm },
  localHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md },
  localSongCount: { fontSize: 14 },
  playAllButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: SIZES.radius },
  playAllText: { fontSize: 14, fontWeight: '600' },
  skeletonContainer: { paddingTop: SPACING.md },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: SPACING.lg },
  emptySubtitle: { fontSize: 14, marginTop: SPACING.sm, textAlign: 'center', maxWidth: 280 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: SIZES.radius, padding: SPACING.xl, width: '85%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: SPACING.lg },
  modalInput: { borderRadius: SIZES.radius, padding: SPACING.md, fontSize: 16, marginBottom: SPACING.lg },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  modalButton: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: SIZES.radius },
  modalButtonText: { fontSize: 16 },
  modalButtonTextPrimary: { fontSize: 16, fontWeight: '600' },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  albumsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  albumCard: { width: ALBUM_CARD_WIDTH, marginBottom: SPACING.lg },
  albumImage: { width: '100%', aspectRatio: 1, borderRadius: SIZES.radius },
  albumTitle: { fontSize: 14, fontWeight: '600', marginTop: SPACING.sm },
  albumArtist: { fontSize: 12, marginTop: 2 },
});

export default LibraryScreen;