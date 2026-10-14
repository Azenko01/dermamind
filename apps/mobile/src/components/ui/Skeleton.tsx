import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { useTheme } from '@/theme';

/** Grey pulsing lines while text loads (PLAN.md 6: every screen has a loading state). */
export function SkeletonLines({ lines = 3 }: { lines?: number }) {
  const { colors, spacing } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    let loop: Animated.CompositeAnimation | undefined;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [opacity]);

  return (
    <View accessible accessibilityLabel="Wczytywanie" style={{ gap: spacing.sm }}>
      {Array.from({ length: lines }, (_, i) => (
        <Animated.View
          key={i}
          style={{
            height: 14,
            borderRadius: 7,
            width: i === lines - 1 ? '60%' : '100%',
            backgroundColor: colors.surface,
            opacity,
          }}
        />
      ))}
    </View>
  );
}
