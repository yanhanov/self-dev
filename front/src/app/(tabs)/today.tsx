import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { api, friendlyError, TodayResponse } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

function formatPlanDate(raw?: string) {
  if (!raw) return 'сегодня';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  } catch {
    return raw;
  }
}

export default function TodayScreen() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      setError(friendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const doneCount = useMemo(
    () => data?.tasks.filter((t) => t.status === 'done').length ?? 0,
    [data]
  );
  const totalCount = data?.tasks.length ?? 0;

  async function markDone(taskId: string) {
    if (!userId) return;
    setBusyId(taskId);
    try {
      await api.completeTask(userId, taskId);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusyId(null);
    }
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
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={Palette.accent}
            />
          }>
          <View style={styles.header}>
            <ThemedText type="label" themeColor="textSecondary">
              {formatPlanDate(data?.plan.plan_date)}
            </ThemedText>
            <ThemedText type="title">План дня</ThemedText>
            {data ? (
              <ThemedText type="small" themeColor="textSecondary">
                {data.plan.summary}
              </ThemedText>
            ) : null}
          </View>

          {totalCount > 0 ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressMeta}>
                <ThemedText type="smallBold">
                  {doneCount} из {totalCount} задач
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {doneCount === totalCount ? 'день закрыт' : 'в работе'}
                </ThemedText>
              </View>
              <ProgressBar value={doneCount} total={totalCount} />
            </View>
          ) : null}

          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}

          {!data?.tasks?.length && !error ? (
            <View style={styles.empty}>
              <ThemedText type="smallBold">Пока пусто</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Потяните вниз, чтобы обновить, или откройте курс и пройдите следующий урок.
              </ThemedText>
              <Button label="К курсу" variant="ghost" onPress={() => router.push('/course')} />
            </View>
          ) : null}

          <View style={styles.list}>
            {data?.tasks.map((task, index) => {
              const done = task.status === 'done';
              return (
                <View key={task.id} style={[styles.task, done && styles.taskDone]}>
                  <View style={styles.taskTop}>
                    <View style={[styles.badge, done && styles.badgeDone]}>
                      <ThemedText type="label" style={done ? styles.badgeTextDone : styles.badgeText}>
                        {String(index + 1).padStart(2, '0')}
                      </ThemedText>
                    </View>
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
                  <View style={styles.actions}>
                    {task.lesson_id ? (
                      <Pressable
                        onPress={() => router.push(`/lesson/${task.lesson_id}`)}
                        style={styles.linkBtn}>
                        <ThemedText type="linkPrimary">Открыть урок →</ThemedText>
                      </Pressable>
                    ) : (
                      <View />
                    )}
                    {!done ? (
                      <Button
                        label={busyId === task.id ? '…' : 'Готово'}
                        variant="soft"
                        onPress={() => markDone(task.id)}
                        disabled={busyId === task.id}
                        style={styles.doneBtn}
                      />
                    ) : (
                      <ThemedText type="label" style={styles.doneLabel}>
                        сделано
                      </ThemedText>
                    )}
                  </View>
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
  progressBlock: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  empty: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
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
    borderColor: Palette.mint,
    backgroundColor: '#F4FBFA',
  },
  taskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: '#FFE8E0',
  },
  badgeDone: {
    backgroundColor: Palette.paperAlt,
  },
  badgeText: { color: Palette.accent },
  badgeTextDone: { color: Palette.mint },
  taskTitle: { fontSize: 22, lineHeight: 28 },
  actions: {
    marginTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  linkBtn: { paddingVertical: 8 },
  doneBtn: { minWidth: 120 },
  doneLabel: { color: Palette.success },
  error: { color: Palette.danger },
});
