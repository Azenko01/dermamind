import { CheckIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { QuestionScreen } from '@/components/ui/QuestionScreen';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';
import { stepNav } from '../steps';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SIZE = 200;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const LENGTH = 2 * Math.PI * R;

/** O20: ring fills to 100% with a little confetti. No invented numbers (PLAN.md 6.1). */
export function ReadyStep() {
  const { colors, spacing } = useTheme();
  const { progress, next, back } = stepNav('ready');
  const [fill] = useState(() => new Animated.Value(0));
  const [percent, setPercent] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      setReduceMotion(reduce);
      if (reduce) {
        fill.setValue(1);
        setPercent(100);
        return;
      }
      const id = fill.addListener(({ value }) => setPercent(Math.round(value * 100)));
      Animated.timing(fill, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => fill.removeListener(id));
    });
    return () => {
      cancelled = true;
      fill.removeAllListeners();
    };
  }, [fill]);

  const offset = fill.interpolate({ inputRange: [0, 1], outputRange: [LENGTH, 0] });

  return (
    <QuestionScreen progress={progress} onBack={back} nextLabel="Zaczynamy" onNext={next}>
      {!reduceMotion && percent === 100 ? <Confetti /> : null}
      <View style={[styles.center, { marginTop: spacing.xl }]}>
        <Svg width={SIZE} height={SIZE}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.accentSoft}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={LENGTH}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>
        <View style={styles.percent}>
          <Text
            variant="title"
            style={{ fontSize: 44, lineHeight: 52 }}
            accessibilityLabel={`${percent} procent`}
          >
            {`${percent}%`}
          </Text>
        </View>
      </View>
      <Text variant="title" align="center">
        Twój profil jest gotowy
      </Text>
      <View style={{ gap: spacing.md }}>
        <Point text="Każdy produkt ocenimy pod kątem Twojej skóry" />
        <Point text="Ostrzeżemy przed składnikami, których unikasz" />
        <Point text="Pomożemy ułożyć rutynę na rano i wieczór" />
      </View>
    </QuestionScreen>
  );
}

function Point({ text }: { text: string }) {
  const { colors, spacing } = useTheme();
  return (
    <View style={[styles.point, { gap: spacing.md }]}>
      <View style={[styles.check, { backgroundColor: colors.goodSoft }]}>
        <CheckIcon size={16} weight="bold" color={colors.good} />
      </View>
      <Text style={{ flex: 1 }}>{text}</Text>
    </View>
  );
}

function Confetti() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  // Deterministic "random" spread — renders stay pure and every run looks the same.
  const [pieces] = useState(() => {
    const palette = [colors.accent, colors.good, colors.caution, colors.bad, colors.primary];
    return Array.from({ length: 28 }, (_, i) => ({
      x: (((i * 37) % 100) / 100) * width,
      color: palette[i % palette.length],
      delay: (i * 53) % 300,
      spin: i % 2 ? 1 : -1,
      fall: new Animated.Value(0),
    }));
  });

  useEffect(() => {
    Animated.stagger(
      20,
      pieces.map((p) =>
        Animated.timing(p.fall, {
          toValue: 1,
          duration: 1600,
          delay: p.delay,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [pieces]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.piece,
            {
              left: p.x,
              backgroundColor: p.color,
              opacity: p.fall.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: p.fall.interpolate({ inputRange: [0, 1], outputRange: [-20, 520] }) },
                {
                  rotate: p.fall.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${p.spin * 540}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  percent: { position: 'absolute' },
  point: { flexDirection: 'row', alignItems: 'center' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  piece: { position: 'absolute', top: 0, width: 8, height: 14, borderRadius: 2 },
});
