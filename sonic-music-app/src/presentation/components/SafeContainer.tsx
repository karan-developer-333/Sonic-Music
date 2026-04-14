import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '../../application/store/hooks';
import { COLORS, LIGHT_COLORS } from '../theme/theme';

interface SafeContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padTop?: boolean;
  padBottom?: boolean;
}

export const SafeContainer: React.FC<SafeContainerProps> = ({ 
  children, 
  style,
  padTop = true,
  padBottom = false
}) => {
  const insets = useSafeAreaInsets();
  const colors = useAppSelector(state => state.theme.colors);

  return (
    <View 
      style={[
        styles.container, 
        { backgroundColor: colors.background },
        padTop && { paddingTop: insets.top },
        padBottom && { paddingBottom: insets.bottom },
        style
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
