import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

type Props = TextInputProps & {
  label: string;
};

export function FieldInput({ label, style, ...rest }: Props) {
  return (
    <View style={styles.wrap}>
      <ThemedText type="label">{label}</ThemedText>
      <TextInput
        placeholderTextColor={Palette.inkSoft}
        style={[styles.input, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  input: {
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 14,
    fontSize: 16,
    color: Palette.ink,
    fontFamily: Fonts.serif,
  },
});
