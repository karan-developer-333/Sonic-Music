import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playSong } from '../../application/store/slices/playerSlice';
import { MusicApiService } from '../../data/services/MusicApiService';
import { MiniPlayer } from '../components/MiniPlayer';
import { Search, X, TrendingUp, Music, Loader } from 'lucide-react-native';
import { CategoryChip } from '../components/CategoryChip';
import { Song } from '../../domain/models/MusicModels';

const TRENDING_SEARCHES = ['Bollywood', 'Arijit Singh', 'Sharma', 'Romantic', 'Devotional'];

export const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const { currentSong } = useAppSelector(state => state.player);
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();
  
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (selectedGenre) setSelectedGenre(null);
    
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    debounceTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await MusicApiService.searchSongs(text);
        setSearchResults(results);
      } catch (e) {
        console.log('Search error:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 150);
  }, [selectedGenre]);

  const handleSongPress = (song: Song) => {
    dispatch(playSong({ song, queue: searchResults }));
  };

  const handleMiniPlayerPress = () => navigation.navigate('Player');

  const handleGenrePress = (genre: string) => {
    if (selectedGenre === genre) {
      setSelectedGenre(null);
      setSearchQuery('');
    } else {
      setSelectedGenre(genre);
      setSearchQuery('');
    }
  };

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Loader size={32} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Searching...</Text>
        </View>
      );
    }

    if (!searchQuery && !selectedGenre) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Search for songs</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Search by song name or artist</Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Music size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsContent}>
        {searchResults.map((song) => (
          <TouchableOpacity 
            key={song.id} 
            style={styles.songItem} 
            onPress={() => handleSongPress(song)}
          >
            <Image source={{ uri: song.coverUrl }} style={styles.songImage} />
            <View style={styles.songInfo}>
              <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{song.title}</Text>
              <Text style={[styles.songArtist, { color: colors.textMuted }]} numberOfLines={1}>{song.artist}</Text>
            </View>
            <Music size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeContainer style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          currentSong && styles.scrollContentWithPlayer
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.secondary }]}>
            <Search size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search songs, artists..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchChange}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <CategoryChip label="All" isActive={!selectedGenre} onPress={() => setSelectedGenre(null)} />
            <CategoryChip label="Bollywood" isActive={selectedGenre === 'bollywood'} onPress={() => handleGenrePress('bollywood')} />
            <CategoryChip label="Indie" isActive={selectedGenre === 'indie'} onPress={() => handleGenrePress('indie')} />
            <CategoryChip label="Devotional" isActive={selectedGenre === 'devotional'} onPress={() => handleGenrePress('devotional')} />
            <CategoryChip label="Classical" isActive={selectedGenre === 'classical'} onPress={() => handleGenrePress('classical')} />
          </ScrollView>
        </View>

        {recentSearches.length > 0 && !searchQuery && !selectedGenre && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
          </View>
        )}

        {!searchQuery && !selectedGenre && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending</Text>
            </View>
            <View style={styles.trendingContainer}>
              {TRENDING_SEARCHES.map((trend, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.trendingItem, { backgroundColor: colors.secondary }]}
                  onPress={() => setSearchQuery(trend)}
                >
                  <Text style={[styles.trendingText, { color: colors.text }]}>{trend}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {(searchQuery || selectedGenre) && renderSearchResults()}
      </ScrollView>
      
      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  scrollContentWithPlayer: { paddingBottom: 0 },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: SPACING.lg },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md, height: 50,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 16 },
  filterContainer: { paddingVertical: SPACING.md, gap: SPACING.sm },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  trendingContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  trendingItem: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: SIZES.radius,
  },
  trendingText: { fontSize: 14 },
  resultsContent: { paddingHorizontal: SPACING.lg, paddingBottom: 100 },
  songItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md,
  },
  songImage: { width: 50, height: 50, borderRadius: 8 },
  songInfo: { flex: 1, marginLeft: SPACING.md },
  songTitle: { fontSize: 16, fontWeight: '600' },
  songArtist: { fontSize: 14, marginTop: 2 },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  loadingText: { fontSize: 14, marginTop: SPACING.sm },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: SPACING.lg },
  emptySubtitle: { fontSize: 14, marginTop: SPACING.sm },
});

export default SearchScreen;