import React from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useAppSelector } from '../../application/store/hooks';
import { SPACING } from '../theme/theme';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'large',
  fullScreen = false,
}) => {
  const colors = useAppSelector(state => state.theme.colors);

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size={size} color={colors.primary} />
        {message && (
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      )}
    </View>
  );
};

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const colors = useAppSelector(state => state.theme.colors);

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.secondary,
        },
        style,
      ]}
    />
  );
};

interface SongCardSkeletonProps {
  width?: number;
}

export const SongCardSkeleton: React.FC<SongCardSkeletonProps> = ({ width = 160 }) => {
  const colors = useAppSelector(state => state.theme.colors);

  return (
    <View style={[styles.songCardSkeleton, { width, backgroundColor: colors.card }]}>
      <Skeleton width="100%" height={160} borderRadius={0} />
      <View style={styles.songCardInfo}>
        <Skeleton width="80%" height={14} />
        <Skeleton width="50%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
};

interface SongListItemSkeletonProps {
  showCover?: boolean;
}

export const SongListItemSkeleton: React.FC<SongListItemSkeletonProps> = ({
  showCover = true,
}) => {
  const colors = useAppSelector(state => state.theme.colors);

  return (
    <View style={styles.songListItem}>
      {showCover && <Skeleton width={50} height={50} borderRadius={8} />}
      <View style={styles.songListItemInfo}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} style={{ marginTop: 4 }} />
      </View>
    </View>
  );
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
  message: {
    marginTop: SPACING.md,
    fontSize: 14,
  },
  skeleton: {
    overflow: 'hidden',
  },
  songCardSkeleton: {
    marginRight: SPACING.md,
    borderRadius: 20,
    overflow: 'hidden',
  },
  songCardInfo: {
    padding: SPACING.sm,
  },
  songListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  songListItemInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
});
