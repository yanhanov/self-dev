import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, Palette, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'brand'
    | 'headline'
    | 'subtitle'
    | 'small'
    | 'smallBold'
    | 'meta'
    | 'metaBold'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'label';
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
        type === 'headline' && styles.headline,
        type === 'subtitle' && styles.subtitle,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'meta' && styles.meta,
        type === 'metaBold' && styles.metaBold,
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
  default: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  brand: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  title: {
    fontFamily: Fonts.sans,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  headline: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
  },
  small: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  smallBold: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  meta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400',
  },
  metaBold: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  label: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  link: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Palette.brand,
  },
  linkPrimary: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    color: Palette.brand,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
