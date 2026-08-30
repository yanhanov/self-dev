import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius } from '@/constants/theme';

type Props = {
  label: string;
  size?: number;
  /** Rounded square reads as an entity/course; a circle reads as a person. */
  shape?: 'circle' | 'square';
  tone?: 'brand' | 'neutral';
};

function initials(label: string) {
  return label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ label, size = 48, shape = 'square', tone = 'brand' }: Props) {
  const brand = tone === 'brand';

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: shape === 'circle' ? size / 2 : Radius.sm,
          backgroundColor: brand ? Palette.brandSoft : Palette.surfaceAlt,
        },
      ]}>
      <ThemedText
        type="smallBold"
        style={{
          fontSize: Math.round(size * 0.36),
          lineHeight: Math.round(size * 0.44),
          color: brand ? Palette.brandDeep : Palette.inkSoft,
        }}>
        {initials(label)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
