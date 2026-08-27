import { StyleSheet, View } from 'react-native';

import { Palette, Radius } from '@/constants/theme';

type Props = {
  value: number;
  total: number;
};

export function ProgressBar({ value, total }: Props) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(20,32,28,0.08)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Palette.accent,
    borderRadius: Radius.sm,
  },
});
