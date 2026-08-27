import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, Palette, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'brand' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'label';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'brand' && styles.brand,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        type === 'label' && styles.label,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontFamily: Fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  smallBold: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontFamily: Fonts.serif,
    fontSize: 17,
    lineHeight: 26,
    fontWeight: '400',
  },
  brand: {
    fontFamily: Fonts.sans,
    fontSize: Platform.select({ web: 72, default: 56 }),
    fontWeight: '800',
    lineHeight: Platform.select({ web: 72, default: 58 }),
    letterSpacing: -2,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: Platform.select({ web: 40, default: 32 }),
    fontWeight: '700',
    lineHeight: Platform.select({ web: 44, default: 36 }),
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.4,
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: Fonts.sans,
    lineHeight: 24,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
    textDecorationColor: Palette.accent,
  },
  linkPrimary: {
    fontFamily: Fonts.sans,
    lineHeight: 24,
    fontSize: 15,
    fontWeight: '700',
    color: Palette.accent,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' }) ?? '500',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
