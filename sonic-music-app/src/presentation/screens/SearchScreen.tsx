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
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { playSong } from '../../application/store/slices/playerSlice';
import { MusicApiService } from '../../data/services/MusicApiService';
import { MiniPlayer } from '../components/MiniPlayer';
import { Ionicons } from '@expo/vector-icons';
import { CategoryChip } from '../components/CategoryChip';
import { Song } from '../../domain/models/MusicModels';

const DEBOUNCE_DELAY = 300;
const MIN_QUERY_LENGTH = 2;

const TRENDING_SEARCHES = ['Bollywood Hits', 'Arijit Singh', 'Armaan Malik', 'Romantic Songs', 'Devotional'];
const GENRE_SUGGESTIONS = ['Bollywood', 'Punjabi', 'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Indie Pop'];

export const SearchScreen = ({ navigation }: any) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const { currentSong } = useAppSelector(state => state.player);
  const colors = useAppSelector(state => state.theme.colors);
  const dispatch = useAppDispatch();

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<TextInput>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (selectedGenre) setSelectedGenre(null);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (suggestionTimer.current) clearTimeout(suggestionTimer.current);

    if (!text.trim()) {
      setSearchResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      setSearchLoading(false);
      return;
    }

    const trimmedText = text.trim();
    setShowSuggestions(true);

    suggestionTimer.current = setTimeout(async () => {
      setSuggestionLoading(true);
      try {
        const filtered = GENRE_SUGGESTIONS.filter(g =>
          g.toLowerCase().includes(trimmedText.toLowerCase())
        );
        const fromTrending = TRENDING_SEARCHES.filter(t =>
          t.toLowerCase().includes(trimmedText.toLowerCase())
        );
        const fromRecent = recentSearches.filter(r =>
          r.toLowerCase().includes(trimmedText.toLowerCase())
        );
        setSuggestions([...new Set([...fromRecent, ...fromTrending, ...filtered])].slice(0, 5));
      } finally {
        setSuggestionLoading(false);
      }
    }, 100);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (trimmedText.length < MIN_QUERY_LENGTH) {
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      setShowSuggestions(false);
      try {
        const results = await MusicApiService.searchSongs(trimmedText);
        if (!abortControllerRef.current?.signal.aborted) {
          setSearchResults(results);
        }
      } catch (e) {
        if (!abortControllerRef.current?.signal.aborted) {
          console.log('Search error:', e);
          setSearchResults([]);
        }
      } finally {
        if (!abortControllerRef.current?.signal.aborted) {
          setSearchLoading(false);
        }
      }
    }, DEBOUNCE_DELAY);
  }, [selectedGenre, recentSearches]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    Keyboard.dismiss();

    if (!recentSearches.includes(suggestion)) {
      setRecentSearches(prev => [suggestion, ...prev.slice(0, 4)]);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setSearchLoading(true);
    MusicApiService.searchSongs(suggestion)
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
    setSearchResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchLoading(false);
    inputRef.current?.focus();
  }, []);

  const handleSongPress = (song: Song) => {
    dispatch(playSong({ song, queue: searchResults }));
  };

  const handleMiniPlayerPress = () => navigation.navigate('Player');

  const handleGenrePress = useCallback((genre: string) => {
    const genreSearch = genre.toLowerCase();
    const searchTerm = genre === 'bollywood' ? 'Bollywood songs' : `${genre} songs`;

    if (selectedGenre === genre) {
      setSelectedGenre(null);
      setSearchQuery('');
      setSearchResults([]);
      return;
    }

    setSelectedGenre(genre);
    setSearchQuery(searchTerm);
    setShowSuggestions(false);
    Keyboard.dismiss();

    if (!recentSearches.includes(searchTerm)) {
      setRecentSearches(prev => [searchTerm, ...prev.slice(0, 4)]);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setSearchLoading(true);
    MusicApiService.searchSongs(searchTerm)
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
  }, [selectedGenre, recentSearches]);

  const handleTrendingPress = useCallback((trend: string) => {
    handleSuggestionPress(trend);
  }, [handleSuggestionPress]);

  const handleRecentSearchPress = useCallback((recent: string) => {
    handleSuggestionPress(recent);
  }, [handleSuggestionPress]);

  const renderSuggestions = () => {
    if (!showSuggestions) return null;
    if (suggestionLoading) {
      return (
        <View style={[styles.suggestionsContainer, { backgroundColor: colors.secondary }]}>
          <ActivityIndicator size="small" color={colors.primary} style={styles.suggestionLoader} />
        </View>
      );
    }

    if (suggestions.length === 0 && searchQuery.length >= MIN_QUERY_LENGTH) {
      return null;
    }

    const hasRecent = recentSearches.length > 0;
    const hasMatches = suggestions.length > 0;

    if (!hasRecent && !hasMatches) return null;

    return (
      <View style={[styles.suggestionsContainer, { backgroundColor: colors.secondary }]}>
        {recentSearches.length > 0 && searchQuery.length === 0 && (
          <View style={styles.suggestionSection}>
            <View style={styles.suggestionSectionHeader}>
              <Ionicons name="time" size={14} color={colors.textMuted} />
              <Text style={[styles.suggestionSectionTitle, { color: colors.textMuted }]}>Recent</Text>
            </View>
            {recentSearches.map((recent, index) => (
              <TouchableOpacity
                key={`recent-${index}`}
                style={styles.suggestionItem}
                onPress={() => handleRecentSearchPress(recent)}
              >
                <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                <Text style={[styles.suggestionText, { color: colors.text }]}>{recent}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {suggestions.length > 0 && (
          <View style={styles.suggestionSection}>
            {searchQuery.length >= MIN_QUERY_LENGTH && (
              <View style={styles.suggestionSectionHeader}>
                <Ionicons name="keypad" size={14} color={colors.textMuted} />
                <Text style={[styles.suggestionSectionTitle, { color: colors.textMuted }]}>Suggestions</Text>
              </View>
            )}
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`suggestion-${index}`}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <Text style={[styles.suggestionText, { color: colors.text }]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderSearchResults = () => {
    if (searchLoading) {
      return (
        <View style={styles.loadingContainer}>
          <Ionicons name="hourglass" size={32} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Searching...</Text>
        </View>
      );
    }

    if (!searchQuery && !selectedGenre) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Search for songs</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Search by song name or artist</Text>
        </View>
      );
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-note" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No results found</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>Try a different search term</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.resultsContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.songItem}
            onPress={() => handleSongPress(item)}
          >
            <Image source={{ uri: item.coverUrl }} style={styles.songImage} />
            <View style={styles.songInfo}>
              <Text style={[styles.songTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
              <Text style={[styles.songArtist, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
            </View>
            <Ionicons name="musical-note" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    );
  };

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
              placeholder="Search songs, artists..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearchChange}
              onFocus={() => searchQuery.length >= MIN_QUERY_LENGTH && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {renderSuggestions()}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <CategoryChip label="All" isActive={!selectedGenre} onPress={() => setSelectedGenre(null)} />
            <CategoryChip label="Bollywood" isActive={selectedGenre === 'bollywood'} onPress={() => handleGenrePress('bollywood')} />
            <CategoryChip label="Punjabi" isActive={selectedGenre === 'punjabi'} onPress={() => handleGenrePress('punjabi')} />
            <CategoryChip label="Tamil" isActive={selectedGenre === 'tamil'} onPress={() => handleGenrePress('tamil')} />
            <CategoryChip label="Telugu" isActive={selectedGenre === 'telugu'} onPress={() => handleGenrePress('telugu')} />
            <CategoryChip label="Devotional" isActive={selectedGenre === 'devotional'} onPress={() => handleGenrePress('devotional')} />
          </ScrollView>
        </View>

        {!searchQuery && !selectedGenre && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              currentSong && styles.scrollContentWithPlayer
            ]}
          >
            {recentSearches.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="time" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Searches</Text>
                </View>
                <View style={styles.trendingContainer}>
                  {recentSearches.map((recent, index) => (
                    <TouchableOpacity
                      key={`recent-${index}`}
                      style={[styles.trendingItem, { backgroundColor: colors.secondary }]}
                      onPress={() => handleRecentSearchPress(recent)}
                    >
                      <Ionicons name="time" size={14} color={colors.textMuted} />
                      <Text style={[styles.trendingText, { color: colors.text, marginLeft: 6 }]}>{recent}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trending-up" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Trending</Text>
              </View>
              <View style={styles.trendingContainer}>
                {TRENDING_SEARCHES.map((trend, index) => (
                  <TouchableOpacity
                    key={`trend-${index}`}
                    style={[styles.trendingItem, { backgroundColor: colors.secondary }]}
                    onPress={() => handleTrendingPress(trend)}
                  >
                    <Text style={[styles.trendingText, { color: colors.text }]}>{trend}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {(searchQuery.length >= MIN_QUERY_LENGTH || selectedGenre) && (
          <View style={[styles.resultsWrapper, currentSong && styles.resultsWrapperWithPlayer]}>
            {renderSearchResults()}
          </View>
        )}
      </View>

      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrapper: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  scrollContentWithPlayer: { paddingBottom: 0 },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: SPACING.lg, zIndex: 10 },
  searchInputContainer: {
    flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.radius,
    paddingHorizontal: SPACING.md, height: 50,
  },
  searchInput: { flex: 1, marginLeft: SPACING.sm, fontSize: 16 },
  suggestionsContainer: {
    marginTop: SPACING.xs,
    borderRadius: SIZES.radius,
    padding: SPACING.sm,
  },
  suggestionLoader: {
    paddingVertical: SPACING.sm,
  },
  suggestionSection: {
    marginBottom: SPACING.sm,
  },
  suggestionSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  suggestionSectionTitle: {
    fontSize: 12,
    marginLeft: SPACING.xs,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
  },
  suggestionText: {
    fontSize: 15,
    marginLeft: SPACING.sm,
  },
  filterContainer: { paddingVertical: SPACING.md, gap: SPACING.sm },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: SPACING.md },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  trendingContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
  },
  trendingText: { fontSize: 14 },
  resultsWrapper: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  resultsWrapperWithPlayer: {
    paddingBottom: 80,
  },
  resultsContent: { paddingBottom: 100 },
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