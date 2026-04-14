import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SPACING, SIZES } from '../theme/theme';
import { useAppSelector } from '../../application/store/hooks';

interface CategoryChipProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

export const CategoryChip: React.FC<CategoryChipProps> = ({ label, isActive, onPress }) => {
  const colors = useAppSelector(state => state.theme.colors);
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { backgroundColor: isActive ? colors.primary : colors.secondary }
      ]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.text, 
        { color: isActive ? colors.background : colors.textMuted }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: SIZES.radius,
    marginRight: SPACING.sm,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
