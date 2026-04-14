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
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playSong } from '../../application/store/slices/playerSlice';
import { createPlaylist, deletePlaylist, addToPlaylist, removeFromPlaylist, selectPlaylistById } from '../../application/store/slices/playlistSlice';
import { MiniPlayer } from '../components/MiniPlayer';
import { SongListItem } from '../components/SongListItem';
import { SongListItemSkeleton } from '../components/LoadingState';
import { ErrorState, EmptyState } from '../components/ErrorState';
import { MediaService } from '../../data/services/MediaService';
import { Song } from '../../domain/models/MusicModels';
import { Plus, Heart, Music2, Trash2, FileMusic, Smartphone } from 'lucide-react-native';

type LibraryTab = 'playlists' | 'liked' | 'local';

export const LibraryScreen = ({ navigation }: any) => {
  const [activeTab, setActiveTab] = useState<LibraryTab>('playlists');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  
  const [localSongs, setLocalSongs] = useState<Song[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const playlists = useAppSelector(state => state.playlist.playlists);
  const currentSong = useAppSelector(state => state.player.currentSong);
  const colors = useAppSelector(state => state.theme.colors);
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

  useEffect(() => { fetchLocalSongs(); }, [fetchLocalSongs]);

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

  const handlePlaySong = (song: Song) => {
    dispatch(playSong({ song, queue: localSongs }));
  };

  const handlePlayAllLocal = () => localSongs.length > 0 && dispatch(playSong({ song: localSongs[0], queue: localSongs }));
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
          icon={<Smartphone size={32} color={colors.textMuted} />}
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
        <Plus size={24} color={colors.primary} />
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
              <Trash2 size={18} color={colors.textMuted} />
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
          <Heart size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No liked songs yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Tap heart on songs to add them here</Text>
        </View>
      );
    }
    return songs.map((song) => (
      <SongListItem
        key={song.id}
        song={song}
        onPress={handlePlaySong}
        showCover
        showActions={false}
        isCurrentSong={currentSong?.id === song.id}
      />
    ));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'local': return renderLocalContent();
      case 'playlists': return renderPlaylistsContent();
      case 'liked': return renderLikedContent();
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
            <FileMusic size={18} color={activeTab === 'local' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'local' ? colors.background : colors.textMuted }]}>Device</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { backgroundColor: activeTab === 'playlists' ? colors.primary : colors.secondary }]} onPress={() => setActiveTab('playlists')}>
            <Music2 size={18} color={activeTab === 'playlists' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'playlists' ? colors.background : colors.textMuted }]}>Playlists</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, { backgroundColor: activeTab === 'liked' ? colors.primary : colors.secondary }]} onPress={() => setActiveTab('liked')}>
            <Heart size={18} color={activeTab === 'liked' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, { color: activeTab === 'liked' ? colors.background : colors.textMuted }]}>Liked</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>{renderContent()}</View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
      
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
});

export default LibraryScreen;