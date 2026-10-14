import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme, type ColorToken } from '@/theme';
import { Text } from './Text';

/** Score in a ring in the label colour (D1 match card). */
export function ScoreRing({
  score,
  color,
  size = 80,
}: {
  score: number;
  color: ColorToken;
  size?: number;
}) {
  const { colors } = useTheme();
  const stroke = 6;
  const r = (size - stroke) / 2;
  const length = 2 * Math.PI * r;
  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityLabel={`Wynik ${score} na 100`}
    >
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill={colors.background} />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors[color]}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - score / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text
          variant="section"
          color={color}
          style={{ fontSize: size * 0.34, lineHeight: size * 0.42 }}
        >
          {score}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
