import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { type Href, router } from 'expo-router';

import { CourseRail } from '@/components/course-rail';
import { AppShell } from '@/components/layout/app-shell';
import { MissionPlayer } from '@/components/mission-player';
import { ThemedText } from '@/components/themed-text';
import { TutorChat } from '@/components/tutor-chat';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Palette, Spacing } from '@/constants/theme';
import { api, Course, friendlyError, TodayMission, TodayResponse } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function TodayScreen() {
  const [mission, setMission] = useState<TodayMission | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsAssessment, setNeedsAssessment] = useState(false);
  const [adaptation, setAdaptation] = useState<string | null>(null);
  const [daily, setDaily] = useState<TodayResponse | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [completingTask, setCompletingTask] = useState<string | null>(null);

  const isDa = course?.profession_slug === 'data_analyst';

  const load = useCallback(async () => {
    const uid = await getStoredUserId();
    if (!uid) {
      router.replace('/onboarding');
      return;
    }

    try {
      const courseRes = await api.getCourse(uid).catch(() => null);
      setCourse(courseRes);

      const da = courseRes?.profession_slug === 'data_analyst';
      if (da) {
        setDaily(null);
        try {
          const missionRes = await api.getTodayMission(uid);
          setMission(missionRes.mission);
          setMessage(missionRes.message || null);
          setNeedsAssessment(Boolean(missionRes.needs_assessment));
          setAdaptation(missionRes.adaptation?.reason || null);
          setError(null);
        } catch (e) {
          setError(friendlyError(e));
        }
      } else {
        setMission(null);
        setNeedsAssessment(false);
        setAdaptation(null);
        try {
          const plan = await api.getToday(uid);
          setDaily(plan);
          setMessage(null);
          setError(null);
        } catch (e) {
          setError(friendlyError(e));
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markTaskDone(taskId: string) {
    const uid = await getStoredUserId();
    if (!uid) return;
    setCompletingTask(taskId);
    try {
      await api.completeTask(uid, taskId);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setCompletingTask(null);
    }
  }

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.brand} />
          <ThemedText type="small" themeColor="textSecondary">
            Подбираем план на сегодня…
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
        <View style={styles.column}>
          <Card>
            <View style={styles.cardStack}>
              <View style={styles.planHead}>
                <Icon name="calendar" size={16} color={Palette.inkSoft} />
                <ThemedText type="meta" themeColor="textSecondary">
                  {isDa ? "Today's Mission" : 'План на сегодня'}
                </ThemedText>
              </View>
              {adaptation ? (
                <ThemedText type="small" style={styles.adapt}>
                  {adaptation}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  {isDa
                    ? 'Одна миссия на сегодня — ~30 минут, один конкретный навык.'
                    : daily?.plan.summary || 'Короткий план на сегодня по вашему курсу.'}
                </ThemedText>
              )}
            </View>
          </Card>

          {error ? (
            <Card>
              <View style={styles.cardStack}>
                <ThemedText type="small" style={styles.error}>
                  {error}
                </ThemedText>
                <Button label="Повторить" onPress={load} />
              </View>
            </Card>
          ) : null}

          {isDa ? (
            <>
              {mission && mission.status !== 'completed' ? (
                <MissionPlayer mission={mission} onUpdated={setMission} />
              ) : null}

              {mission?.status === 'completed' ? (
                <Card>
                  <View style={styles.cardStack}>
                    <ThemedText type="subtitle">Миссия выполнена</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Навык обновлён. Завтра будет следующая миссия — или откройте проект / прогресс.
                    </ThemedText>
                    <View style={styles.row}>
                      <Button label="Прогресс" onPress={() => router.push('/progress' as Href)} />
                      <Button
                        label="Проект"
                        variant="secondary"
                        onPress={() => router.push('/project' as Href)}
                      />
                    </View>
                  </View>
                </Card>
              ) : null}

              {!mission && !error ? (
                <Card>
                  <View style={styles.cardStack}>
                    <ThemedText type="subtitle">{message || 'Миссий пока нет'}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {needsAssessment
                        ? 'Assessment занимает ~10 минут и открывает персональные миссии.'
                        : 'Откройте курс или portfolio project, если миссии уже пройдены.'}
                    </ThemedText>
                    <View style={styles.row}>
                      {needsAssessment ? (
                        <Button
                          label="Пройти assessment"
                          onPress={() => router.push('/assessment' as Href)}
                        />
                      ) : (
                        <Button label="Курс" onPress={() => router.push('/course')} />
                      )}
                      <Button
                        label="Проект"
                        variant="secondary"
                        onPress={() => router.push('/project' as Href)}
                      />
                    </View>
                  </View>
                </Card>
              ) : null}
            </>
          ) : (
            <>
              {daily?.tasks.map((task) => (
                <Card key={task.id}>
                  <View style={styles.cardStack}>
                    <ThemedText type="smallBold">{task.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {task.description}
                      {task.estimated_minutes != null
                        ? ` · ~${task.estimated_minutes} мин`
                        : ''}
                    </ThemedText>
                    <View style={styles.row}>
                      {task.lesson_id ? (
                        <Button
                          label="Открыть урок"
                          onPress={() => router.push(`/lesson/${task.lesson_id}`)}
                        />
                      ) : null}
                      {task.status !== 'done' ? (
                        <Button
                          label={completingTask === task.id ? '…' : 'Готово'}
                          variant="secondary"
                          disabled={completingTask === task.id}
                          onPress={() => markTaskDone(task.id)}
                        />
                      ) : (
                        <ThemedText type="meta" themeColor="textSecondary">
                          Сделано
                        </ThemedText>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
              {!daily?.tasks.length && !error ? (
                <Card>
                  <View style={styles.cardStack}>
                    <ThemedText type="subtitle">План ещё собирается</ThemedText>
                    <Button label="К курсу" onPress={() => router.push('/course')} />
                  </View>
                </Card>
              ) : null}
            </>
          )}

          <Card>
            <View style={styles.cardStack}>
              <ThemedText type="smallBold">AI Mentor</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isDa
                  ? 'Спросите про JOIN, метрики или ошибку в задаче — наставник знает ваш skill graph.'
                  : 'Спросите про урок или задачу — наставник опирается на базу знаний курса.'}
              </ThemedText>
              <Button
                label="Спросить наставника"
                variant="secondary"
                icon="sparkle"
                onPress={() => setTutorOpen(true)}
              />
            </View>
          </Card>
        </View>

        <TutorChat
          lessonTitle={mission?.title || daily?.tasks[0]?.title}
          skillSlug={mission?.skill_slug}
          open={tutorOpen}
          onOpenChange={setTutorOpen}
        />
      </AppShell>
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
  column: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  cardStack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  adapt: { color: Palette.brandDeep },
  error: { color: Palette.danger },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    alignItems: 'center',
  },
});
