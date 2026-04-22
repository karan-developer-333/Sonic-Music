import React, { useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeContainer } from '../components/SafeContainer';
import { COLORS, SPACING, SIZES } from '../theme/theme';
import { useAppSelector } from '../../application/store/hooks';
import Feather from '@expo/vector-icons/Feather';

const { width, height } = Dimensions.get('window');

export const OnboardingScreen = ({ navigation }: any) => {
  const colors = useAppSelector((state: any) => state.theme.colors);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 1000 });
    scale.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.5)) });
    translateY.value = withTiming(0, { duration: 800 });
  }, []); 

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
    };
  });

  const textStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: withDelay(500, withTiming(1, { duration: 800 })),
      transform: [{ translateY: withDelay(500, withTiming(0, { duration: 800 })) }],
    };
  });

  return (
    <SafeContainer padTop={false} style={styles.container}>
      <LinearGradient
        colors={[colors.secondary, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.content, animatedStyle]}>
        <View style={styles.iconContainer}>
          <Feather name="headphones" size={120} color={colors.primary} />
          <View style={[styles.glow, { backgroundColor: colors.primary }]} />
        </View>

        <Animated.View style={[styles.footer, textStyle]}>
          <Text style={[styles.title, { color: colors.text }]}>Start Your{"\n"}Sonic Journey</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Experience music like never before with high-fidelity sound and neon aesthetics.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => navigation.replace('Main')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: colors.background }]}>Turn on your music</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </SafeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.xxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.2, 
    zIndex: -1,
  },
  footer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: SPACING.md,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xxl * 1.5,
    paddingHorizontal: SPACING.lg,
  },
  button: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: SIZES.radius,
    width: '100%',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
