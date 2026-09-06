import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Palette } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const SelfDevTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Palette.brand,
    background: Palette.paper,
    card: Palette.surface,
    text: Palette.ink,
    border: Palette.line,
    notification: Palette.brand,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={SelfDevTheme}>
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Palette.paper } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'card' }} />
        <Stack.Screen name="assessment" options={{ presentation: 'card' }} />
        <Stack.Screen name="lesson/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </ThemeProvider>
  );
}
