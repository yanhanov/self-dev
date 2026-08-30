import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

export function FieldInput({ label, hint, error, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <ThemedText type="meta" themeColor="textSecondary">
        {label}
      </ThemedText>
      <TextInput
        placeholderTextColor={Palette.inkFaint}
        style={[styles.input, focused && styles.inputFocused, !!error && styles.inputError, style]}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <ThemedText type="meta" style={styles.error}>
          {error}
        </ThemedText>
      ) : hint ? (
        <ThemedText type="meta" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  input: {
    backgroundColor: Palette.surfaceAlt,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderBottomWidth: 1,
    borderRadius: Radius.xs,
    paddingHorizontal: Spacing.three,
    minHeight: 48,
    fontSize: 16,
    color: Palette.ink,
    fontFamily: Fonts.sans,
  },
  inputFocused: {
    borderColor: Palette.ink,
    borderBottomWidth: 2,
    backgroundColor: Palette.surface,
  },
  inputError: {
    borderColor: Palette.danger,
    borderBottomWidth: 2,
  },
  error: {
    color: Palette.danger,
  },
});
