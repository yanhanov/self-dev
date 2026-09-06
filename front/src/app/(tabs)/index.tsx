import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Palette, Spacing } from '@/constants/theme';
import { api } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

/**
 * Entry redirect. Finished course → today; otherwise course / assessment / onboarding.
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
        const skills = await api.getSkills(userId).catch(() => null);
        if (skills && skills.skills.every((s) => s.score === 0) && skills.skills.length > 0) {
          // Likely DA without assessment scores — check course
        }
        const course = await api.getCourse(userId);
        if (course.generation_status === 'ready') {
          router.replace('/today');
          return;
        }
        // If DA profile exists but no course yet → assessment
        if (!course.id || course.generation_status === 'pending') {
          try {
            await api.getAssessment('data_analyst');
            if (course.profession_slug === 'data_analyst' && !course.id) {
              router.replace('/assessment');
              return;
            }
          } catch {
            // no assessment for this profession
          }
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
