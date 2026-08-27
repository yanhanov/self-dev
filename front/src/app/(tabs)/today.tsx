import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { api, TodayResponse } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function TodayScreen() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const uid = userId || (await getStoredUserId());
    if (!uid) {
      router.replace('/onboarding');
      return;
    }
    setUserId(uid);
    try {
      const today = await api.getToday(uid);
      setData(today);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function markDone(taskId: string) {
    if (!userId) return;
    await api.completeTask(userId, taskId);
    await load();
  }

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.accent} />
          <ThemedText type="small" themeColor="textSecondary">
            Собираем план на день…
          </ThemedText>
        </View>
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="label" themeColor="textSecondary">
              {data?.plan.plan_date || 'сегодня'}
            </ThemedText>
            <ThemedText type="title">План дня</ThemedText>
            {data ? (
              <ThemedText type="small" themeColor="textSecondary">
                {data.plan.summary}
              </ThemedText>
            ) : null}
          </View>

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          <View style={styles.list}>
            {data?.tasks.map((task, index) => {
              const done = task.status === 'done';
              return (
                <View key={task.id} style={[styles.task, done && styles.taskDone]}>
                  <View style={styles.taskTop}>
                    <ThemedText type="label" style={styles.taskIndex}>
                      {String(index + 1).padStart(2, '0')}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {task.estimated_minutes ? `${task.estimated_minutes} мин` : '—'}
                    </ThemedText>
                  </View>
                  <ThemedText type="subtitle" style={styles.taskTitle}>
                    {task.title}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {task.description}
                  </ThemedText>
                  {!done ? (
                    <Button label="Готово" variant="soft" onPress={() => markDone(task.id)} />
                  ) : (
                    <ThemedText type="label" style={styles.doneLabel}>
                      сделано
                    </ThemedText>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: Spacing.two },
  list: { gap: Spacing.three },
  task: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  taskDone: {
    opacity: 0.7,
    borderColor: Palette.mint,
  },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskIndex: { color: Palette.accent },
  taskTitle: { fontSize: 22, lineHeight: 28 },
  doneLabel: { color: Palette.success },
  error: { color: Palette.danger },
});
