import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { CourseRail, nextOpenLesson } from '@/components/course-rail';
import { AppShell } from '@/components/layout/app-shell';
import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { api, Course, friendlyError, TodayResponse } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

function formatPlanDate(raw?: string) {
  if (!raw) return 'Сегодня';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return raw;
    const formatted = d.toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return raw;
  }
}

export default function TodayScreen() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
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

    const [todayResult, courseResult] = await Promise.allSettled([
      api.getToday(uid),
      api.getCourse(uid),
    ]);

    if (todayResult.status === 'fulfilled') {
      setData(todayResult.value);
      setError(null);
    } else {
      setError(friendlyError(todayResult.reason));
    }
    // The rail is supporting context; a failure here shouldn't block the plan.
    setCourse(courseResult.status === 'fulfilled' ? courseResult.value : null);

    setLoading(false);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const doneCount = useMemo(
    () => data?.tasks.filter((t) => t.status === 'done').length ?? 0,
    [data]
  );
  const totalCount = data?.tasks.length ?? 0;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const next = useMemo(() => nextOpenLesson(course), [course]);

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
          <ActivityIndicator color={Palette.brand} />
          <ThemedText type="small" themeColor="textSecondary">
            Собираем план на день…
          </ThemedText>
        </View>
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <AppShell
        aside={<CourseRail course={course} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Palette.brand}
          />
        }>
        <Card>
          <View style={styles.planHead}>
            <Icon name="calendar" size={16} color={Palette.inkSoft} />
            <ThemedText type="meta" themeColor="textSecondary">
              {formatPlanDate(data?.plan.plan_date)}
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.pageTitle}>
            План на день
          </ThemedText>
          {data?.plan.summary ? (
            <ThemedText type="small" themeColor="textSecondary">
              {data.plan.summary}
            </ThemedText>
          ) : null}

          {totalCount > 0 ? (
            <View style={styles.progressBlock}>
              <View style={styles.progressRow}>
                <ThemedText type="metaBold" themeColor="textSecondary">
                  {doneCount} из {totalCount} задач
                </ThemedText>
                <ThemedText type="metaBold" style={allDone ? styles.doneText : styles.brandText}>
                  {allDone ? 'День закрыт' : 'В работе'}
                </ThemedText>
              </View>
              <ProgressBar
                value={doneCount}
                total={totalCount}
                tone={allDone ? 'success' : 'brand'}
              />
            </View>
          ) : null}

          {next ? (
            <View style={styles.planActions}>
              <Button
                label={`Открыть урок ${next.order_index}`}
                icon="play"
                onPress={() => router.push(`/lesson/${next.id}`)}
              />
              <Button
                label="Вся программа"
                variant="tertiary"
                onPress={() => router.push('/course')}
              />
            </View>
          ) : null}
        </Card>

        {error ? (
          <Card>
            <View style={styles.errorBlock}>
              <ThemedText type="small" style={styles.errorText}>
                {error}
              </ThemedText>
              <Button label="Повторить" variant="secondary" icon="refresh" onPress={load} />
            </View>
          </Card>
        ) : null}

        {!data?.tasks?.length && !error ? (
          <Card>
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="sparkle" size={22} color={Palette.brand} filled />
              </View>
              <ThemedText type="subtitle">На сегодня задач нет</ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Обновите страницу или откройте программу курса и пройдите следующий урок.
              </ThemedText>
              <Button label="Перейти к курсу" onPress={() => router.push('/course')} />
            </View>
          </Card>
        ) : null}

        {data?.tasks.map((task, index) => {
          const done = task.status === 'done';
          return (
            <Card key={task.id} padded={false}>
              <View style={styles.taskHead}>
                <View style={[styles.taskIcon, done && styles.taskIconDone]}>
                  {done ? (
                    <Icon name="check" size={16} color={Palette.success} />
                  ) : (
                    <ThemedText type="metaBold" style={styles.taskIndex}>
                      {index + 1}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.taskCopy}>
                  <ThemedText type="subtitle" style={done ? styles.taskTitleDone : undefined}>
                    {task.title}
                  </ThemedText>
                  <View style={styles.taskMeta}>
                    <Icon name="clock" size={13} color={Palette.inkSoft} />
                    <ThemedText type="meta" themeColor="textSecondary">
                      {task.estimated_minutes ? `${task.estimated_minutes} мин` : 'без таймера'}
                    </ThemedText>
                    {done ? (
                      <ThemedText type="meta" style={styles.doneText}>
                        · Выполнено
                      </ThemedText>
                    ) : null}
                  </View>
                </View>
              </View>

              {task.description ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.taskBody}>
                  {task.description}
                </ThemedText>
              ) : null}

              <Divider style={styles.taskDivider} />

              <View style={styles.taskActions}>
                {task.lesson_id ? (
                  <ActionButton
                    icon="article"
                    label="Открыть урок"
                    onPress={() => router.push(`/lesson/${task.lesson_id}`)}
                  />
                ) : (
                  <View />
                )}
                {!done ? (
                  <ActionButton
                    icon="checkCircle"
                    label={busyId === task.id ? 'Сохраняем…' : 'Отметить готовым'}
                    disabled={busyId === task.id}
                    onPress={() => markDone(task.id)}
                  />
                ) : (
                  <View style={styles.doneTag}>
                    <Icon name="checkCircle" size={16} color={Palette.success} filled />
                    <ThemedText type="metaBold" style={styles.doneText}>
                      Готово
                    </ThemedText>
                  </View>
                )}
              </View>
            </Card>
          );
        })}
      </AppShell>
    </Atmosphere>
  );
}

/** Flat icon+label action, the pattern LinkedIn uses under every post. */
function ActionButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        pressed && styles.actionPressed,
        disabled && styles.actionDisabled,
      ]}>
      <Icon name={icon} size={18} color={Palette.inkSoft} />
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pageTitle: { marginTop: Spacing.one, marginBottom: Spacing.one },
  progressBlock: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  planActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  brandText: { color: Palette.brand },
  doneText: { color: Palette.success },
  errorBlock: { gap: Spacing.three, alignItems: 'flex-start' },
  errorText: { color: Palette.danger },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandSoft,
    marginBottom: Spacing.one,
  },
  emptyText: { textAlign: 'center', maxWidth: 340, marginBottom: Spacing.two },
  taskHead: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
    padding: Spacing.four,
    paddingBottom: Spacing.two,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandSoft,
  },
  taskIconDone: { backgroundColor: Palette.successSoft },
  taskIndex: { color: Palette.brandDeep },
  taskCopy: { flex: 1, gap: 2 },
  taskTitleDone: { color: Palette.inkSoft },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  taskBody: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  taskDivider: { marginHorizontal: Spacing.four },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.two,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.xs,
  },
  actionPressed: { backgroundColor: Palette.surfaceHover },
  actionDisabled: { opacity: 0.5 },
  doneTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
