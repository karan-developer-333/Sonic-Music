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
import { MiniPlayer } from '../components/MiniPlayer';
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
  Moon
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
  const dispatch = useAppDispatch();

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
              <User size={40} color={colors.primary} />
            </View>
            <View style={[styles.avatarGlow, { backgroundColor: colors.primary }]} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>Sonic Listener</Text>
            <Text style={[styles.profileSubtitle, { color: colors.primary }]}>Premium Member</Text>
          </View>
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

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: colors.card }]}>
          <Text style={[styles.logoutText, { color: colors.danger }]}>Sign Out</Text>
        </TouchableOpacity>

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
