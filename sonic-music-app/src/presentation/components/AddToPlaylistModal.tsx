import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Song } from '../../domain/models/MusicModels';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { selectPlaylists } from '../../application/store/slices/playlistSlice';
import { createPlaylist, addToPlaylist } from '../../application/store/slices/playlistSlice';
import { SPACING, SIZES } from '../theme/theme';
import { Ionicons } from '@expo/vector-icons';

interface AddToPlaylistModalProps {
  visible: boolean;
  song: Song | null;
  onClose: () => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  visible,
  song,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const colors = useAppSelector((state) => state.theme.colors);
  const playlists = useAppSelector(selectPlaylists);

  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const isSongInPlaylist = useCallback((playlistId: string) => {
    if (!song) return false;
    const playlist = playlists.find((p) => p.id === playlistId);
    return playlist?.songs.some((s) => s.id === song.id) || false;
  }, [song, playlists]);

  const handleAddToPlaylist = useCallback((playlistId: string) => {
    if (!song) return;
    dispatch(addToPlaylist({ playlistId, song }));
    onClose();
  }, [dispatch, song, onClose]);

  const handleCreatePlaylist = useCallback(() => {
    if (newPlaylistName.trim()) {
      dispatch(createPlaylist(newPlaylistName.trim()));
      setNewPlaylistName('');
      setShowCreateInput(false);
    }
  }, [dispatch, newPlaylistName]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableOpacity activeOpacity={1}>
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.card,
                  paddingBottom: insets.bottom + SPACING.md,
                },
              ]}
            >
              <View style={[styles.header, { borderBottomColor: colors.secondary }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  Add to Playlist
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {song && (
                <View style={[styles.songInfo, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={[styles.songArtist, { color: colors.textMuted }]} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.createButton, { borderBottomColor: colors.secondary }]}
                onPress={() => setShowCreateInput(true)}
              >
                <View style={[styles.createIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={24} color={colors.background} />
                </View>
                <Text style={[styles.createText, { color: colors.text }]}>
                  Create New Playlist
                </Text>
              </TouchableOpacity>

              {showCreateInput && (
                <View style={[styles.inputContainer, { backgroundColor: colors.secondary }]}>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Playlist name"
                    placeholderTextColor={colors.textMuted}
                    value={newPlaylistName}
                    onChangeText={setNewPlaylistName}
                    autoFocus
                    onSubmitEditing={handleCreatePlaylist}
                  />
                  <TouchableOpacity
                    style={[styles.inputButton, { backgroundColor: colors.primary }]}
                    onPress={handleCreatePlaylist}
                    disabled={!newPlaylistName.trim()}
                  >
                    <Ionicons name="checkmark" size={20} color={colors.background} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.inputButton}
                    onPress={() => {
                      setShowCreateInput(false);
                      setNewPlaylistName('');
                    }}
                  >
                    <Ionicons name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={playlists.filter((p) => p.id !== 'liked')}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isInPlaylist = isSongInPlaylist(item.id);
                  return (
                    <TouchableOpacity
                      style={[styles.playlistItem, { borderBottomColor: colors.secondary }]}
                      onPress={() => handleAddToPlaylist(item.id)}
                    >
                      <View style={[styles.playlistIcon, { backgroundColor: colors.secondary }]}>
                        <Ionicons name="musical-notes" size={20} color={colors.textMuted} />
                      </View>
                      <View style={styles.playlistInfo}>
                        <Text style={[styles.playlistName, { color: colors.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.playlistCount, { color: colors.textMuted }]}>
                          {item.songs.length} {item.songs.length === 1 ? 'song' : 'songs'}
                        </Text>
                      </View>
                      {isInPlaylist && (
                        <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                }}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      No playlists yet
                    </Text>
                    <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                      Create a playlist to get started
                    </Text>
                  </View>
                }
              />
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: SIZES.radius,
    borderTopRightRadius: SIZES.radius,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: SPACING.xs,
  },
  songInfo: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  songArtist: {
    fontSize: 14,
    marginTop: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  createIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: SPACING.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  inputButton: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SPACING.lg,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  playlistIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
  },
  playlistCount: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: SPACING.xs,
  },
});
