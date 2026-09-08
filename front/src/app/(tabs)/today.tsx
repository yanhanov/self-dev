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
import { api, Course, friendlyError, TodayMission } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function TodayScreen() {
  const [mission, setMission] = useState<TodayMission | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsAssessment, setNeedsAssessment] = useState(false);
  const [adaptation, setAdaptation] = useState<string | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutorOpen, setTutorOpen] = useState(false);

  const load = useCallback(async () => {
    const uid = await getStoredUserId();
    if (!uid) {
      router.replace('/onboarding');
      return;
    }

    try {
      const [missionRes, courseRes] = await Promise.allSettled([
        api.getTodayMission(uid),
        api.getCourse(uid),
      ]);

      if (missionRes.status === 'fulfilled') {
        setMission(missionRes.value.mission);
        setMessage(missionRes.value.message || null);
        setNeedsAssessment(Boolean(missionRes.value.needs_assessment));
        setAdaptation(missionRes.value.adaptation?.reason || null);
        setError(null);
      } else {
        setError(friendlyError(missionRes.reason));
      }
      setCourse(courseRes.status === 'fulfilled' ? courseRes.value : null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.brand} />
          <ThemedText type="small" themeColor="textSecondary">
            Подбираем сегодняшнюю миссию…
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
                  Today's Mission
                </ThemedText>
              </View>
              {adaptation ? (
                <ThemedText type="small" style={styles.adapt}>
                  {adaptation}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Одна миссия на сегодня — ~30 минут, один конкретный навык.
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

          <Card>
            <View style={styles.cardStack}>
              <ThemedText type="smallBold">AI Mentor</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Спросите про JOIN, метрики или ошибку в задаче — наставник знает ваш skill graph.
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
          lessonTitle={mission?.title}
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
