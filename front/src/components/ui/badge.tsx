import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning';

const TONES: Record<BadgeTone, { bg: string; fg: string }> = {
  neutral: { bg: Palette.surfaceAlt, fg: Palette.inkSoft },
  brand: { bg: Palette.brandSoft, fg: Palette.brandDeep },
  success: { bg: Palette.successSoft, fg: Palette.success },
  warning: { bg: Palette.warningSoft, fg: Palette.warning },
};

type Props = ViewProps & {
  label: string;
  tone?: BadgeTone;
};

export function Badge({ label, tone = 'neutral', style, ...rest }: Props) {
  const colors = TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, style]} {...rest}>
      <ThemedText type="metaBold" style={{ color: colors.fg }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
});
