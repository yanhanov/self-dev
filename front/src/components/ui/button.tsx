import { forwardRef } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Radius, Spacing } from '@/constants/theme';

type Props = PressableProps & {
  label: string;
  variant?: 'primary' | 'ghost' | 'soft';
};

export const Button = forwardRef<React.ComponentRef<typeof Pressable>, Props>(
  function Button({ label, variant = 'primary', style, disabled, ...rest }, ref) {
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          variant === 'primary' && styles.primary,
          variant === 'ghost' && styles.ghost,
          variant === 'soft' && styles.soft,
          pressed && styles.pressed,
          disabled && styles.disabled,
          typeof style === 'function' ? style({ pressed }) : style,
        ]}
        {...rest}>
        <ThemedText
          type="smallBold"
          style={[
            styles.label,
            variant === 'primary' && styles.labelOnAccent,
            variant === 'ghost' && styles.labelGhost,
            variant === 'soft' && styles.labelSoft,
          ]}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }
);

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Palette.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Palette.ink,
  },
  soft: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    letterSpacing: 0.2,
  },
  labelOnAccent: {
    color: '#fff',
  },
  labelGhost: {
    color: Palette.ink,
  },
  labelSoft: {
    color: Palette.ink,
  },
});
