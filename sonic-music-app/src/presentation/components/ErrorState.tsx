import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../../application/store/hooks';
import { SPACING, SIZES } from '../theme/theme';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

interface ErrorStateProps {
  error?: string;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  type?: 'default' | 'network' | 'not-found' | 'permission';
  fullScreen?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  error,
  title,
  message,
  onRetry,
  retryText = 'Try Again',
  type = 'default',
  fullScreen = false,
}) => {
  const colors = useAppSelector(state => state.theme.colors);

  const getDefaults = () => {
    switch (type) {
        case 'network':
        return {
          icon: 'cloud-offline' as any,
          defaultTitle: 'Connection Error',
          defaultMessage: 'Please check your internet connection and try again.',
        };
        case 'not-found':
        return {
          icon: 'help-circle-outline' as any,
          defaultTitle: 'Not Found',
          defaultMessage: "We couldn't find what you're looking for.",
        };
        case 'permission':
        return {
          icon: 'alert-circle' as any,
          defaultTitle: 'Permission Required',
          defaultMessage: 'Please grant the required permissions to continue.',
        };
      default:
        return {
          icon: 'alert-circle' as any,
          defaultTitle: 'Something Went Wrong',
          defaultMessage: error || 'An unexpected error occurred. Please try again.',
        };
    }
  };

  const { icon, defaultTitle, defaultMessage } = getDefaults();

  const displayTitle = title || defaultTitle;
  const displayMessage = message || defaultMessage;

  const content = (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
        <Ionicons name={icon} size={32} color={colors.danger} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{displayTitle}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{displayMessage}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={onRetry}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={18} color={colors.background} />
          <Text style={[styles.retryText, { color: colors.background }]}>{retryText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
};

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onPress: () => void;
  };
  fullScreen?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon,
  action,
  fullScreen = false,
}) => {
  const colors = useAppSelector(state => state.theme.colors);

  const content = (
    <View style={styles.container}>
      {icon && <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>{icon}</View>}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}
      {action && (
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={[styles.retryText, { color: colors.background }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
        {content}
      </View>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: SIZES.radius,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
