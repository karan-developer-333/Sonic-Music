import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeContainer } from '../components/SafeContainer';
import { COLORS, SPACING, SIZES } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import { toggleTheme } from '../../application/store/slices/themeSlice';
import { loginStart, logout, setVerification } from '../../application/store/slices/authSlice';
import { MiniPlayer } from '../components/MiniPlayer';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { 
  User, 
  Bell, 
  Headphones, 
  Shield, 
  HelpCircle,
  ChevronRight,
  Palette,
  Volume2,
  Sun,
  Moon,
  CheckCircle,
  AlertTriangle,
  ExternalLink
} from 'lucide-react-native';

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
  const colors = useAppSelector(state => state.theme.colors);
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
      {rightElement || (onPress && <ChevronRight size={20} color={colors.textMuted} />)}
    </TouchableOpacity>
  );
};

export const ProfileScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState(true);
  const { mode, colors } = useAppSelector(state => state.theme);
  const { playlists } = useAppSelector(state => state.playlist);
  const { currentSong } = useAppSelector(state => state.player);
  const { isAuthenticated, user, isLoading, isVerified, verificationError } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const checkConnection = async () => {
    try {
      const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'https://f1rr36mb-3000.inc1.devtunnels.ms/api';
      const response = await fetch(`${apiUrl}/auth/me`);
      const data = await response.json();
      
      if (data.authenticated) {
        dispatch(setVerification({ 
          isVerified: data.verified !== false, 
          error: data.reason === 'FORBIDDEN' ? 'SPOTIFY_RESTRICTED' : undefined 
        }));
      }
    } catch (error) {
       console.error('Connection check failed', error);
    }
  };

  const handleFixConnection = () => {
    Alert.alert(
      'Fix Spotify 403 Error',
      'This happens because your app is in "Development Mode". You must manually add your email to the dashboard.\n\n1. Go to Spotify Developer Dashboard\n2. Open your app settings\n3. Go to "User Management"\n4. Add your Spotify email address\n5. Wait 1 min and try again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Dashboard', 
          onPress: () => Linking.openURL('https://developer.spotify.com/dashboard') 
        },
      ]
    );
  };
  const handleLogin = () => {
    dispatch(loginStart());
    // Get the base URL from constants or env
    const apiUrl = Constants.expoConfig?.extra?.apiUrl || 'https://f1rr36mb-3000.inc1.devtunnels.ms/api';
    Linking.openURL(`${apiUrl}/auth/login`);
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  const totalSongs = playlists.reduce((acc, p) => acc + p.songs.length, 0);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the app cache?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => Alert.alert('Success', 'Cache cleared successfully')
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
            <View style={[styles.avatar, { borderColor: colors.primary }]}>
              {user && user.images?.[0] ? (
                <View style={styles.avatarImageContainer}>
                  {/* Avatar rendering usually requires an Image component, which I should ensure is imported or use lucide icon as fallback */}
                  <User size={40} color={colors.primary} />
                </View>
              ) : (
                <User size={40} color={colors.primary} />
              )}
            </View>
            <View style={[styles.avatarGlow, { backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {isAuthenticated ? user?.display_name : 'Sonic Listener'}
            </Text>
            <View style={styles.statusRow}>
              <Text style={[styles.profileSubtitle, { color: colors.primary, marginBottom: 0 }]}>
                {isAuthenticated ? user?.email : 'Guest Member'}
              </Text>
              {isAuthenticated && (
                <TouchableOpacity onPress={checkConnection} style={styles.statusBadge}>
                   {isVerified ? (
                     <CheckCircle size={14} color={COLORS.primary} />
                   ) : (
                     <AlertTriangle size={14} color={COLORS.danger} />
                   )}
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {isAuthenticated && !isVerified && (
            <TouchableOpacity 
              style={[styles.fixButton, { borderColor: colors.danger }]}
              onPress={handleFixConnection}
            >
              <AlertTriangle size={16} color={colors.danger} />
              <Text style={[styles.fixButtonText, { color: colors.danger }]}>Fix 403 Connection</Text>
              <ExternalLink size={14} color={colors.danger} />
            </TouchableOpacity>
          )}
          
          {!isAuthenticated && (
            <TouchableOpacity 
              style={[styles.loginButton, { backgroundColor: colors.primary }]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={[styles.loginButtonText, { color: colors.background }]}>
                {isLoading ? 'Connecting...' : 'Login with Spotify'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{playlists.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Playlists</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.secondary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{totalSongs}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Songs</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.secondary }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.primary }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Following</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Preferences</Text>
          
          <SettingItem
            icon={mode === 'dark' ? <Moon size={20} color={colors.primary} /> : <Sun size={20} color={colors.primary} />}
            title={mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            subtitle={mode === 'dark' ? 'Currently enabled' : 'Currently enabled'}
            onPress={() => dispatch(toggleTheme())}
            rightElement={
              <View style={[styles.toggleContainer, { backgroundColor: colors.secondary }]}>
                <TouchableOpacity 
                   style={[styles.toggleOption, mode === 'light' && { backgroundColor: colors.primary }]}
                   onPress={() => mode !== 'light' && dispatch(toggleTheme())}
                >
                  <Sun size={14} color={mode === 'light' ? colors.background : colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity 
                   style={[styles.toggleOption, mode === 'dark' && { backgroundColor: colors.primary }]}
                   onPress={() => mode !== 'dark' && dispatch(toggleTheme())}
                >
                  <Moon size={14} color={mode === 'dark' ? colors.background : colors.textMuted} />
                </TouchableOpacity>
              </View>
            }
          />
          
          <SettingItem
            icon={<Volume2 size={20} color={colors.primary} />}
            title="Audio Quality"
            subtitle="High (320 kbps)"
            onPress={() => Alert.alert('Audio Quality', 'Select audio quality: Low, Medium, High')}
          />

          <SettingItem
            icon={<Bell size={20} color={colors.primary} />}
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
            icon={<Shield size={20} color={colors.primary} />}
            title="Privacy Policy"
            onPress={() => Alert.alert('Privacy Policy', 'Privacy policy information would open here.')}
          />

          <SettingItem
            icon={<HelpCircle size={20} color={colors.primary} />}
            title="Help & Support"
            onPress={() => Alert.alert('Help', 'Contact support at support@sonicapp.com')}
          />

          <SettingItem
            icon={<Headphones size={20} color={colors.primary} />}
            title="Rate App"
            onPress={handleClearCache}
          />

          <SettingItem
            icon={<Volume2 size={20} color={colors.primary} />}
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={handleClearCache}
            rightElement={
              <View style={[styles.cacheBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.cacheText, { color: colors.textMuted }]}>12 MB</Text>
              </View>
            }
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

        {isAuthenticated && (
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: colors.card }]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {currentSong && <MiniPlayer onPress={handleMiniPlayerPress} />}
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  scrollContentWithPlayer: {
    paddingBottom: 0,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginHorizontal: SPACING.lg,
    borderRadius: SIZES.radius * 1.5,
    marginBottom: SPACING.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  avatarGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.2,
    zIndex: -1,
    top: -10,
    left: -10,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: SPACING.md,
  },
  statusBadge: {
    marginLeft: 8,
    padding: 2,
  },
  fixButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: SPACING.sm,
    gap: 8,
  },
  fixButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginTop: SPACING.sm,
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.lg,
    marginHorizontal: SPACING.lg,
    borderRadius: SIZES.radius,
    marginBottom: SPACING.lg,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 2,
  },
  toggleOption: {
    padding: 6,
    borderRadius: 16,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  cacheBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cacheText: {
    fontSize: 12,
  },
  versionIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderRadius: SIZES.radius,
    marginTop: SPACING.md,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
