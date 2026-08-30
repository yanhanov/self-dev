import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

type Props = {
  title: string;
  subtitle?: string;
  selected?: boolean;
  onPress: () => void;
};

export function Choice({ title, subtitle, selected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.base, selected && styles.selected, pressed && styles.pressed]}>
      <View style={[styles.radio, selected && styles.radioOn]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.copy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderRadius: Radius.sm,
    padding: Spacing.four,
  },
  selected: {
    borderColor: Palette.brand,
    backgroundColor: Palette.brandSoft,
  },
  pressed: {
    backgroundColor: Palette.surfaceAlt,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 1,
    borderWidth: 1.5,
    borderColor: Palette.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: Palette.brand,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.brand,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
});
