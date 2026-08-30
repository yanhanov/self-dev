import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

type Props = {
  value: number;
  total: number;
  tone?: 'brand' | 'success';
};

export function ProgressBar({ value, total, tone = 'brand' }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}>
      <View
        style={[
          styles.fill,
          { width: `${pct}%`, backgroundColor: tone === 'success' ? Palette.success : Palette.brand },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surfaceAlt,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
