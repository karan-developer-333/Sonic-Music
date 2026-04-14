import React from 'react';
import { StyleSheet, View, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, SIZES } from '../theme/theme';

interface GlassContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({ 
  children, 
  style, 
  intensity = 20 
}) => {
  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={intensity} style={[styles.container, style]}>
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[styles.container, styles.androidGlass, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: SIZES.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  androidGlass: {
    backgroundColor: 'rgba(20, 20, 20, 0.8)',
  },
});
