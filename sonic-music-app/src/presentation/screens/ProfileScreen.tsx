import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { COLORS, SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { toggleTheme } from '../../application/store/slices/themeSlice';
import { logout } from '../../application/store/slices/authSlice';
import { MiniPlayer } from '../components/MiniPlayer';
import AuthService from '../../data/services/AuthService';
import Ionicons from '@expo/vector-icons/Ionicons';
import Feather from '@expo/vector-icons/Feather';


interface SettingItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  rightElement
}) => {
  const colors = useAppSelector((state: any) => state.theme.colors);
  return (
    <TouchableOpacity
      style={[styles.settingItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: colors.secondary }]}>{icon}</View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />)}
    </TouchableOpacity>
  );
};

import { useQueue } from '../../application/hooks/useQueue';

export const ProfileScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState(true);
  const { mode, colors } = useAppSelector((state: any) => state.theme);
  const { playlists } = useAppSelector((state: any) => state.playlist);
  
  // Zustand State
  const { currentSong } = useQueue();
  
  const { isAuthenticated, user, isLoading } = useAppSelector((state: any) => state.auth);
  const dispatch = useAppDispatch();


  const handleLogin = () => {
    navigation.navigate('Auth');
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch(logout())
        },
      ]
    );
  };

  const totalSongs = playlists.reduce((acc: number, p: any) => acc + p.songs.length, 0);
  const likedSongs = playlists.find((p: any) => p.id === 'liked')?.songs.length || 0;


  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            AuthService.clearCache();

            Alert.alert('Success', 'Cache cleared successfully');
          }
        },
      ]
    );
  };

  const handleMiniPlayerPress = () => {
    navigation.navigate('Player');
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatarContainer}>
            {isAuthenticated && user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { borderColor: colors.primary }]}>
                <Feather name="user" size={40} color={colors.primary} />
              </View>
            )}
            <View style={[styles.avatarGlow, { backgroundColor: colors.primary }]} />

          </View>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {isAuthenticated ? (user?.name || user?.email || 'User') : 'Sonic Listener'}
            </Text>
            <Text style={[styles.profileSubtitle, { color: colors.primary }]}>
              {isAuthenticated ? user?.email : 'Guest Member'}
            </Text>
          </View>

          {!isAuthenticated && (
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={20} color="#000" />
              ) : (
                <Text style={[styles.loginButtonText, { color: colors.background }]}>
                  Sign In / Sign Up
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{likedSongs}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Liked</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.secondary }]} />
          <View style={styles.statItem}>
            <Ionicons name="musical-notes" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{playlists.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Playlists</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.secondary }]} />
          <View style={styles.statItem}>
            <Feather name="bookmark" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Saved</Text>
          </View>
        </View>


        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>

          <SettingItem
            icon={mode === 'dark' ? <Ionicons name="moon" size={20} color={colors.primary} /> : <Feather name="sun" size={20} color={colors.primary} />}
            title={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            onPress={() => dispatch(toggleTheme())}
          />

          <SettingItem
            icon={<Feather name="volume-2" size={20} color={colors.primary} />}
            title="Audio Quality"
            subtitle="High (320 kbps)"
            onPress={() => Alert.alert('Audio Quality', 'Select audio quality: Low, Medium, High')}
          />

          <SettingItem
            icon={<Feather name="bell" size={20} color={colors.primary} />}
            title="Notifications"
            subtitle={notifications ? 'Enabled' : 'Disabled'}
            onPress={() => setNotifications(!notifications)}
            rightElement={
              <View style={[styles.switch, notifications && { backgroundColor: colors.primary }]}>
                <View style={[styles.switchThumb, { transform: [{ translateX: notifications ? 16 : 0 }] }]} />
              </View>
            }
          />
        </View>


        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>App</Text>

          <SettingItem
            icon={<Feather name="shield" size={20} color={colors.primary} />}
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy information would open here.')}
          />

          <SettingItem
            icon={<Feather name="help-circle" size={20} color={colors.primary} />}
            title="Help & Support"
            onPress={() => Alert.alert('Help', 'Contact support at support@sonicapp.com')}
          />

          <SettingItem
            icon={<Feather name="trash-2" size={20} color={colors.primary} />}
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={handleClearCache}
          />
        </View>


        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>About</Text>

          <SettingItem
            icon={<Text style={[styles.versionIcon, { color: colors.primary }]}>v</Text>}
            title="Version"
            subtitle="1.0.0"
          />
        </View>

        {isAuthenticated ? (
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: colors.card }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color={colors.danger} />
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        ) : (

          <TouchableOpacity
            style={[styles.loginPrompt, { backgroundColor: colors.card }]}
            onPress={handleLogin}
          >
            <Text style={[styles.loginPromptText, { color: colors.primary }]}>
              Sign in to sync your playlists and liked songs
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  scrollContentWithPlayer: { paddingBottom: 0 },
  header: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  headerTitle: { fontSize: 32, fontWeight: 'bold' },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginHorizontal: SPACING.lg,
    borderRadius: SIZES.radius * 1.5,
    marginBottom: SPACING.lg,
  },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 3,
  },
  avatarGlow: {
    position: 'absolute', width: 100, height: 100, borderRadius: 50,
    opacity: 0.2, zIndex: -1, top: -10, left: -10,
  },
  profileInfo: { alignItems: 'center' },
  profileName: { fontSize: 22, fontWeight: 'bold' },
  profileSubtitle: { fontSize: 14, marginTop: 4 },
  loginButton: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: 20, marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center',
  },
  loginButtonText: { fontSize: 14, fontWeight: 'bold' },
  statsContainer: {
    flexDirection: 'row', justifyContent: 'space-around', paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg, borderRadius: SIZES.radius, marginBottom: SPACING.lg,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 12 },
  statDivider: { width: 1, alignSelf: 'stretch', marginVertical: SPACING.sm },
  section: { marginBottom: SPACING.lg, paddingHorizontal: SPACING.lg },
  sectionTitle: {
    fontSize: 14, fontWeight: '600', marginBottom: SPACING.md,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', borderRadius: SIZES.radius,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  settingIcon: {
    width: 40, height: 40, borderRadius: 10, justifyContent: 'center',
    alignItems: 'center', marginRight: SPACING.md,
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 16, fontWeight: '600' },
  settingSubtitle: { fontSize: 12, marginTop: 2 },
  switch: {
    width: 44, height: 24, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 2,
  },
  switchThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF',
  },
  versionIcon: { fontSize: 16, fontWeight: 'bold' },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    borderRadius: SIZES.radius, marginTop: SPACING.md, gap: SPACING.sm,
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
  loginPrompt: {
    alignItems: 'center', marginHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    borderRadius: SIZES.radius, marginTop: SPACING.md,
  },
  loginPromptText: { fontSize: 14, textAlign: 'center', paddingHorizontal: SPACING.md },
});

export default ProfileScreen;
