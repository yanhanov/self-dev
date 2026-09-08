import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { type Href, router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Palette, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

/**
 * Entry redirect.
 * Data Analyst: assessment → today (missions). Others: course / today when ready.
 */
export default function HomeScreen() {
  useEffect(() => {
    (async () => {
      const userId = await getStoredUserId();
      if (!userId) {
        router.replace('/onboarding');
        return;
      }
      try {
        const course = await api.getCourse(userId);
        const isDa = course.profession_slug === 'data_analyst';

        if (isDa && !course.assessment_completed) {
          router.replace('/assessment' as Href);
          return;
        }

        if (isDa) {
          router.replace('/today');
          return;
        }

        if (course.generation_status === 'ready') {
          router.replace('/today');
          return;
        }

        router.replace('/course');
      } catch {
        router.replace('/onboarding');
      }
    })();
  }, []);

  return (
    <Atmosphere>
      <View style={styles.center}>
        <ActivityIndicator color={Palette.brand} />
        <ThemedText type="small" themeColor="textSecondary">
          Загружаем ваш прогресс…
        </ThemedText>
      </View>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
});
