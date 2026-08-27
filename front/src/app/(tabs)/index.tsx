import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Palette, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function HomeScreen() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const userId = await getStoredUserId();
      if (!userId) {
        setChecking(false);
        return;
      }
      try {
        await api.getCourse(userId);
        router.replace('/course');
      } catch {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.accent} />
        </View>
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero} {...(Platform.OS === 'web' ? ({ className: 'sd-rise' } as object) : {})}>
          <ThemedText type="brand">SelfDev</ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.lead}>
            Персональный путь в frontend или UI/UX — курс, практика и план на день собирает AI.
          </ThemedText>
          <View
            style={styles.actions}
            {...(Platform.OS === 'web' ? ({ className: 'sd-rise-delay' } as object) : {})}>
            <Link href="/onboarding" asChild>
              <Button label="Начать" />
            </Link>
            <Link href="/course" asChild>
              <Button label="У меня уже есть курс" variant="ghost" />
            </Link>
          </View>
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  lead: {
    maxWidth: 520,
  },
  actions: {
    gap: Spacing.two,
    maxWidth: 360,
  },
});
