import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Palette, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

/**
 * Entry redirect. A finished course drops the user straight into the daily
 * plan; a course still being written lands on the course page where the
 * generation progress is visible.
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
        router.replace(course.generation_status === 'ready' ? '/today' : '/course');
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
