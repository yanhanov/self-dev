import '@/global.css';

import { Platform } from 'react-native';

export const Palette = {
  ink: '#14201C',
  inkSoft: '#3D4A44',
  paper: '#F4F1E8',
  paperAlt: '#E7EFE9',
  surface: '#FFFDF8',
  accent: '#FF4D1C',
  accentDeep: '#D93A0F',
  mint: '#1FA2A0',
  line: 'rgba(20, 32, 28, 0.12)',
  danger: '#B42318',
  success: '#1B7A4E',
} as const;

export const Colors = {
  light: {
    text: Palette.ink,
    background: 'transparent',
    backgroundElement: Palette.surface,
    backgroundSelected: '#FFE8E0',
    textSecondary: Palette.inkSoft,
    accent: Palette.accent,
    line: Palette.line,
  },
  dark: {
    // App is light-first; keep tokens mapped so dark OS still looks intentional.
    text: Palette.ink,
    background: 'transparent',
    backgroundElement: Palette.surface,
    backgroundSelected: '#FFE8E0',
    textSecondary: Palette.inkSoft,
    accent: Palette.accent,
    line: Palette.line,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'Syne',
    serif: 'Source Serif 4',
    rounded: 'Syne',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'Syne',
    serif: 'Source Serif 4',
    rounded: 'Syne',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-display)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 16,
  lg: 24,
} as const;

export const HeaderInset = Platform.select({ ios: 64, android: 64, web: 64 }) ?? 64;
export const BottomTabInset = 0;
export const MaxContentWidth = 760;
