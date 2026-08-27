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
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}>
      <View style={styles.row}>
        <View style={[styles.dot, selected && styles.dotOn]} />
        <View style={styles.copy}>
          <ThemedText type="smallBold">{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.md,
    padding: Spacing.three,
  },
  selected: {
    borderColor: Palette.ink,
    backgroundColor: '#FFF4EF',
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 14,
    marginTop: 3,
    borderWidth: 1.5,
    borderColor: Palette.inkSoft,
    backgroundColor: 'transparent',
  },
  dotOn: {
    backgroundColor: Palette.accent,
    borderColor: Palette.accent,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
});
