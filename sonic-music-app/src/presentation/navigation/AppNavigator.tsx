import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { OnboardingScreen, PlayerScreen, PlaylistDetailScreen } from '../screens';
import { TabNavigator as MainTabNavigator } from './TabNavigator';
import { useAppSelector } from '../../application/store/hooks';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Player: undefined;
  PlaylistDetail: { playlistId: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const colors = useAppSelector(state => state.theme.colors);

  const AppTheme = {
    ...DefaultTheme,
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: 'transparent',
      notification: colors.primary,
    },
  };

  return (
    <NavigationContainer theme={AppTheme}>
      <Stack.Navigator 
        initialRouteName="Main"
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          cardStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen 
          name="Player" 
          component={PlayerScreen}
          options={{
            presentation: 'modal',
          }}
        />
        <Stack.Screen 
          name="PlaylistDetail" 
          component={PlaylistDetailScreen}
          options={{
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
