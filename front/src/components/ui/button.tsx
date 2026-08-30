import { forwardRef } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Palette, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'tertiary';

type Props = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconName;
  fullWidth?: boolean;
};

/** react-native-web hands `hovered` to the style callback; native never does. */
function isHovered(state: unknown) {
  return !!(state as { hovered?: boolean }).hovered;
}

const LABEL_COLOR: Record<Variant, string> = {
  primary: '#fff',
  secondary: Palette.brand,
  tertiary: Palette.inkSoft,
};

export const Button = forwardRef<React.ComponentRef<typeof Pressable>, Props>(function Button(
  { label, variant = 'primary', size = 'md', icon, fullWidth, style, disabled, ...rest },
  ref
) {
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      style={(state) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        variant === 'primary' && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'tertiary' && styles.tertiary,
        (state.pressed || isHovered(state)) && variant === 'primary' && styles.primaryActive,
        (state.pressed || isHovered(state)) && variant === 'secondary' && styles.secondaryActive,
        (state.pressed || isHovered(state)) && variant === 'tertiary' && styles.tertiaryActive,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <View style={styles.inner}>
        {icon ? <Icon name={icon} size={18} color={LABEL_COLOR[variant]} /> : null}
        <ThemedText type="smallBold" style={{ color: LABEL_COLOR[variant] }}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  md: {
    minHeight: 36,
    paddingHorizontal: Spacing.four,
  },
  lg: {
    minHeight: 48,
    paddingHorizontal: Spacing.five,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  primary: {
    backgroundColor: Palette.brand,
  },
  primaryActive: {
    backgroundColor: Palette.brandDeep,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: Palette.brand,
  },
  secondaryActive: {
    backgroundColor: Palette.brandWash,
    borderColor: Palette.brandDeep,
  },
  tertiary: {
    backgroundColor: 'transparent',
  },
  tertiaryActive: {
    backgroundColor: Palette.surfaceHover,
  },
  disabled: {
    opacity: 0.45,
  },
});
