import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Keyboard,
  ActivityIndicator,
  SectionList,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playSong } from '../../application/store/slices/playerSlice';
import { MusicApiService } from '../../data/services/MusicApiService';
import { MiniPlayer } from '../components/MiniPlayer';
import { Ionicons } from '@expo/vector-icons';
import { CategoryChip } from '../components/CategoryChip';
import { Song, Album } from '../../domain/models/MusicModels';

const DEBOUNCE_DELAY = 300;
const MIN_QUERY_LENGTH = 2;

const TRENDING_SEARCHES = ['Bollywood Hits', 'Arijit Singh', 'Armaan Malik', 'Romantic Songs', 'Yo Yo Honey Singh'];
const GENRE_SUGGESTIONS = ['Bollywood', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Indie Pop'];

interface SearchResult {
  type: 'song' | 'album' | 'artist';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  coverUrl?: string;
}

export const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<{
    songs: Song[];
    albums: Album[];
    artists: any[];
  }>({ songs: [], albums: [], artists: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { currentSong } = useAppSelector(state => state.player);
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!text.trim()) {
      setSearchResults({ songs: [], albums: [], artists: [] });
      setHasSearched(false);
      setSearchLoading(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length < MIN_QUERY_LENGTH) {
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      setHasSearched(true);

      try {
        const results = await MusicApiService.searchAll(text.trim());
        if (!abortControllerRef.current?.signal.aborted) {
          setSearchResults(results);
        }
      } catch (e) {
        if (!abortControllerRef.current?.signal.aborted) {
          console.log('Search error:', e);
          setSearchResults({ songs: [], albums: [], artists: [] });
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, DEBOUNCE_DELAY);
  }, []);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    Keyboard.dismiss();

    if (!recentSearches.includes(suggestion)) {
      setRecentSearches(prev => [suggestion, ...prev.slice(0, 4)]);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setSearchLoading(true);
    setHasSearched(true);

    MusicApiService.searchAll(suggestion)
      .then(results => {
        if (!abortControllerRef.current?.signal.aborted) {
          setSearchResults(results);
        }
      })
      .catch(e => {
        if (!abortControllerRef.current?.signal.aborted) {
          console.log('Search error:', e);
        }
      })
      .finally(() => {
        if (!abortControllerRef.current?.signal.aborted) {
          setSearchLoading(false);
        }
      });
  }, [recentSearches]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults({ songs: [], albums: [], artists: [] });
    setHasSearched(false);
    setSearchLoading(false);
    inputRef.current?.focus();
  }, []);

  const handleSongPress = useCallback((song: Song) => {
    dispatch(playSong({ song, queue: searchResults.songs }));
  }, [dispatch, searchResults.songs]);

  const handleAlbumPress = useCallback((album: Album) => {
    navigation.navigate('AlbumDetail', { albumId: album.id, title: album.title });
  }, [navigation]);

  const handleArtistPress = useCallback((artistId: string) => {
    navigation.navigate('ArtistDetail', { artistId });
  }, [navigation]);

  const handleMiniPlayerPress = () => navigation.navigate('Player');

  const handleTrendingPress = useCallback((trend: string) => {
    handleSuggestionPress(trend);
  }, [handleSuggestionPress]);

  const handleRecentSearchPress = useCallback((recent: string) => {
    setSearchQuery(recent);
    handleSuggestionPress(recent);
  }, [handleSuggestionPress]);

  const handleClearRecent = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const totalResults = searchResults.songs.length + searchResults.albums.length + searchResults.artists.length;

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Searching...</Text>
        </View>
      );
    }

    if (hasSearched && totalResults === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-note" size={64} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
            Try a different search term or check spelling
          </Text>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsContent}>
        {/* Artists Section */}
        {searchResults.artists.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Artists</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {searchResults.artists.map((artist, index) => (
                <TouchableOpacity
                  key={artist.id || index}
                  style={styles.artistCard}
                  onPress={() => handleArtistPress(artist.id)}
                >
                  <Image
                    source={{ uri: artist.image || artist.thumbnail }}
                    style={styles.artistImage}
                  />
                  <Text style={[styles.artistName, { color: colors.text }]} numberOfLines={1}>
                    {artist.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Albums Section */}
        {searchResults.albums.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Albums</Text>
            <View style={styles.albumsGrid}>
              {searchResults.albums.slice(0, 6).map((album) => (
                <TouchableOpacity
                  key={album.id}
                  style={styles.albumCard}
                  onPress={() => handleAlbumPress(album)}
                >
                  <Image source={{ uri: album.coverUrl || album.artwork }} style={styles.albumImage} />
                  <Text style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1}>
                    {album.title}
                  </Text>
                  <Text style={[styles.albumArtist, { color: colors.textMuted }]} numberOfLines={1}>
                    {album.artist}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Songs Section */}
        {searchResults.songs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Songs ({searchResults.songs.length})
            </Text>
            {searchResults.songs.map((song) => (
              <TouchableOpacity
                key={song.id}
                style={styles.songItem}
                onPress={() => handleSongPress(song)}
              >
                <Image source={{ uri: song.coverUrl }} style={styles.songImage} />
                <View style={styles.songInfo}>
                  <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>
                    {song.title}
                  </Text>
                  <Text style={[styles.songArtist, { color: colors.textMuted }]} numberOfLines={1}>
                    {song.artist}
                  </Text>
                </View>
                <Ionicons name="musical-note" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };

  const renderDefaultContent = () => (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
            <TouchableOpacity onPress={handleClearRecent}>
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((recent, index) => (
            <TouchableOpacity
              key={`recent-${index}`}
              style={styles.recentItem}
              onPress={() => handleRecentSearchPress(recent)}
            >
              <Ionicons name="time" size={16} color={colors.textMuted} />
              <Text style={[styles.recentText, { color: colors.text }]}>{recent}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending Searches</Text>
        <View style={styles.trendingContainer}>
          {TRENDING_SEARCHES.map((trend, index) => (
            <TouchableOpacity
              key={`trend-${index}`}
              style={[styles.trendingItem, { backgroundColor: colors.secondary }]}
              onPress={() => handleTrendingPress(trend)}
            >
              <Ionicons name="trending-up" size={14} color={colors.primary} />
              <Text style={[styles.trendingText, { color: colors.text }]}>{trend}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Browse by Genre</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {GENRE_SUGGESTIONS.map((genre, index) => (
            <TouchableOpacity
              key={`genre-${index}`}
              style={[styles.genreChip, { backgroundColor: colors.card }]}
              onPress={() => handleSuggestionPress(`${genre} songs`)}
            >
              <Text style={[styles.genreText, { color: colors.text }]}>{genre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  return (
    <SafeContainer style={styles.container}>
      <View style={styles.searchWrapper}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
        </View>

        <View style={styles.searchContainer}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.secondary }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              ref={inputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search songs, artists, albums..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {hasSearched ? renderSearchResults() : renderDefaultContent()}
      </View>

      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: SPACING.lg, zIndex: 10 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md,
    height: 50,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 16 },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.md },
  clearText: { fontSize: 14 },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  recentText: { fontSize: 15 },
  trendingContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    gap: SPACING.xs,
  },
  trendingText: { fontSize: 14 },
  genreChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  genreText: { fontSize: 14, fontWeight: '500' },
  resultsContent: { paddingBottom: 100 },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  loadingText: { fontSize: 14, marginTop: SPACING.sm },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl * 2 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginTop: SPACING.lg },
  emptySubtitle: { fontSize: 14, marginTop: SPACING.sm, textAlign: 'center' },
  artistCard: {
    alignItems: 'center',
    marginRight: SPACING.md,
    width: 80,
  },
  artistImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: SPACING.xs,
  },
  artistName: { fontSize: 12, textAlign: 'center' },
  albumsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  albumCard: {
    width: '31%',
    marginBottom: SPACING.md,
  },
  albumImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.xs,
  },
  albumTitle: { fontSize: 12, fontWeight: '600' },
  albumArtist: { fontSize: 11, marginTop: 2 },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  songImage: { width: 50, height: 50, borderRadius: 8 },
  songInfo: { flex: 1, marginLeft: SPACING.md },
  songTitle: { fontSize: 16, fontWeight: '600' },
  songArtist: { fontSize: 14, marginTop: 2 },
});

export default SearchScreen;
