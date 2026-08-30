import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  /** Primary action colour, LinkedIn-style blue. */
  brand: '#0A66C2',
  brandDeep: '#004182',
  brandSoft: '#E8F3FC',
  brandWash: 'rgba(112, 181, 249, 0.2)',

  ink: 'rgba(0, 0, 0, 0.9)',
  inkSoft: 'rgba(0, 0, 0, 0.6)',
  inkFaint: 'rgba(0, 0, 0, 0.45)',

  /** App canvas behind the cards. */
  paper: '#F4F2EE',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F2EF',
  surfaceHover: 'rgba(0, 0, 0, 0.04)',

  line: 'rgba(0, 0, 0, 0.08)',
  lineStrong: 'rgba(0, 0, 0, 0.15)',

  success: '#01754F',
  successSoft: '#DFF5EA',
  warning: '#915907',
  warningSoft: '#FDF3E3',
  danger: '#B24020',
  dangerSoft: '#FBE9E6',
} as const;

export const Colors = {
  light: {
    text: Palette.ink,
    background: Palette.paper,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.brandSoft,
    textSecondary: Palette.inkSoft,
    textFaint: Palette.inkFaint,
    accent: Palette.brand,
    line: Palette.line,
  },
  dark: {
    // App is light-first; keep tokens mapped so dark OS still looks intentional.
    text: Palette.ink,
    background: Palette.paper,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.brandSoft,
    textSecondary: Palette.inkSoft,
    textFaint: Palette.inkFaint,
    accent: Palette.brand,
    line: Palette.line,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** One neutral UI sans across the app, the way LinkedIn reads on every platform. */
export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'System',
    rounded: 'System',
    mono: 'Menlo',
  },
  android: {
    sans: 'sans-serif',
    serif: 'sans-serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    serif: 'System',
    rounded: 'System',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-sans)',
    serif: 'var(--font-sans)',
    rounded: 'var(--font-sans)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

/** Cards sit on a hairline ring rather than a heavy drop shadow. */
export const Elevation = Platform.select({
  web: { boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' } as object,
  default: {
    borderWidth: 1,
    borderColor: Palette.line,
  } as object,
});

export const ElevationRaised = Platform.select({
  web: { boxShadow: '0 4px 12px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.06)' } as object,
  default: {
    borderWidth: 1,
    borderColor: Palette.line,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  } as object,
});

export const HeaderInset = Platform.select({ ios: 56, android: 56, web: 56 }) ?? 56;
export const BottomTabInset = 0;
export const MaxContentWidth = 700;
