import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';

const LINKS: { label: string; go: () => void }[] = [
  { label: 'Сегодня', go: () => router.push('/today') },
  { label: 'Курс', go: () => router.push('/course') },
  { label: 'Изменить цель', go: () => router.push('/onboarding') },
];

export function AppFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.links}>
        {LINKS.map((link, i) => (
          <View key={link.label} style={styles.linkWrap}>
            {i > 0 ? (
              <ThemedText type="meta" themeColor="textFaint">
                ·
              </ThemedText>
            ) : null}
            <Pressable
              accessibilityRole="link"
              onPress={link.go}
              style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}>
              <ThemedText type="meta" themeColor="textSecondary">
                {link.label}
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </View>
      <ThemedText type="meta" themeColor="textFaint">
        SelfDev © {new Date().getFullYear()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.two,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
  },
  linkWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  link: {
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  linkPressed: {
    backgroundColor: Palette.surfaceHover,
  },
});
