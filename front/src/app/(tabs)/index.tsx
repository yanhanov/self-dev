import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Atmosphere } from '@/components/ui/atmosphere';
import { Palette } from '@/constants/theme';
import { api } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

/** Entry redirect: existing users → course, new → onboarding */
export default function HomeScreen() {
  useEffect(() => {
    (async () => {
      const userId = await getStoredUserId();
      if (!userId) {
        router.replace('/onboarding');
        return;
      }
      try {
        await api.getCourse(userId);
        router.replace('/course');
      } catch {
        router.replace('/onboarding');
      }
    })();
  }, []);

  return (
    <Atmosphere>
      <View style={styles.center}>
        <ActivityIndicator color={Palette.accent} />
      </View>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
