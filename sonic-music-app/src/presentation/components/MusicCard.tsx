import React from 'react';
import { StyleSheet, Text, Image, TouchableOpacity, View } from 'react-native';
import { Song } from '../../domain/models/MusicModels';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector } from '../../application/store/hooks';
import { Ionicons } from '@expo/vector-icons';

interface MusicCardProps {
  song: Song;
  onPress: (song: Song) => void;
  width?: number;
}

export const MusicCard: React.FC<MusicCardProps> = ({ song, onPress, width = 160 }) => {
  const colors = useAppSelector(state => state.theme.colors);

  return (
    <TouchableOpacity
      style={[styles.container, { width, backgroundColor: colors.card }]}
      onPress={() => onPress(song)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: song.coverUrl }} style={[styles.cover, { backgroundColor: colors.secondary }]} />
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
        <Text style={[styles.artist, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
      </View>
      <View style={[styles.playButton, { backgroundColor: colors.primary }]}>
        <Ionicons name="play" size={16} color={colors.background} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginRight: SPACING.md,
    borderRadius: SIZES.radius,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: 160,
  },
  info: {
    padding: SPACING.sm,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  artist: {
    fontSize: 12,
    marginTop: 2,
  },
  playButton: {
    position: 'absolute',
    right: 10,
    bottom: 50,
    padding: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
});
