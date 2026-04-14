import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen, SearchScreen, LibraryScreen, ProfileScreen } from '../screens';
import { SIZES, SPACING } from '../theme/theme';
import { useAppSelector } from '../../application/store/hooks';
import { Home, Search, Library, User } from 'lucide-react-native';
import { MiniPlayer } from '../components/MiniPlayer';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const currentSong = useAppSelector(state => state.player.currentSong);
  const colors = useAppSelector(state => state.theme.colors);

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: true,
          tabBarStyle: [
            styles.tabBar,
            { 
              backgroundColor: colors.glass,
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderWidth: 1,
            },
          ],
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarItemStyle: {
            height: 60,
          },
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{
            tabBarIcon: ({ color }) => <Home color={color} size={24} />,
          }}
        />
        <Tab.Screen 
          name="Search" 
          component={SearchScreen} 
          options={{
            tabBarIcon: ({ color }) => <Search color={color} size={24} />,
          }}
        />
        <Tab.Screen 
          name="Library" 
          component={LibraryScreen} 
          options={{
            tabBarIcon: ({ color }) => <Library color={color} size={24} />,
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{
            tabBarIcon: ({ color }) => <User color={color} size={24} />,
          }}
        />
      </Tab.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    position: 'absolute',
    bottom: 25,
    width: '90%',
    marginHorizontal: '5%',
    left: 20,
    right: 20,
    height: 65,
    borderRadius: 35,
    elevation: 10,
    paddingTop: 5,
    overflow: 'hidden',
  },
});