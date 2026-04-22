import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen, ExploreScreen, SearchScreen, LibraryScreen, ProfileScreen } from '../screens';
import { SIZES, SPACING } from '../theme/theme';
import { useAppSelector, useAppDispatch } from '../../application/store/hooks';
import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import { MiniPlayer } from '../components/MiniPlayer';
import { UpNextModal } from '../components/UpNextModal';
import { useQueue } from '../../application/hooks/useQueue';

const Tab = createBottomTabNavigator();

export const TabNavigator = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const colors = useAppSelector(state => state.theme.colors);
  
  // Zustand State
  const { currentSong, isUpNextVisible, openUpNext, closeUpNext } = useQueue();

  const handleOpenPlayer = useCallback(() => {
    (navigation as any).navigate('Player');
  }, [navigation]);

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
            tabBarIcon: ({ color }) => <Ionicons name="home" color={color} size={24} />,
          }}
        />
        <Tab.Screen
          name="Explore"
          component={ExploreScreen}
          options={{
            tabBarIcon: ({ color }) => <Ionicons name="compass" color={color} size={24} />,
          }}
        />
        <Tab.Screen
          name="Search"
          component={SearchScreen}
          options={{
            tabBarIcon: ({ color }) => <Ionicons name="search" color={color} size={24} />,
          }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            tabBarIcon: ({ color }) => <Ionicons name="library" color={color} size={24} />,
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarIcon: ({ color }) => <Feather name="user" color={color} size={24} />,
          }}
        />
      </Tab.Navigator>
      {currentSong && (
        <MiniPlayer onPress={handleOpenPlayer} onQueuePress={openUpNext} />
      )}
      <UpNextModal
        visible={isUpNextVisible}
        onClose={closeUpNext}
        colors={colors}
      />
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