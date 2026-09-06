import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

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
        <Card>
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
          ) : null}
        </Card>

        {error ? (
          <Card>
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
            <Button label="Повторить" onPress={load} />
          </Card>
        ) : null}

        {mission && mission.status !== 'completed' ? (
          <MissionPlayer mission={mission} onUpdated={setMission} />
        ) : null}

        {mission?.status === 'completed' ? (
          <Card>
            <ThemedText type="subtitle">Миссия выполнена</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Навык обновлён. Завтра будет следующая миссия — или откройте проект / прогресс.
            </ThemedText>
            <View style={styles.row}>
              <Button label="Прогресс" onPress={() => router.push('/progress')} />
              <Button label="Проект" variant="secondary" onPress={() => router.push('/project')} />
            </View>
          </Card>
        ) : null}

        {!mission && !error ? (
          <Card>
            <ThemedText type="subtitle">{message || 'Миссий пока нет'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Если вы Data Analyst — сначала пройдите assessment. Иначе откройте курс.
            </ThemedText>
            <View style={styles.row}>
              <Button label="Курс" onPress={() => router.push('/course')} />
              <Button label="Проект" variant="secondary" onPress={() => router.push('/project')} />
            </View>
          </Card>
        ) : null}

        <Button
          label="Спросить AI Mentor"
          variant="tertiary"
          icon="sparkle"
          onPress={() => setTutorOpen(true)}
        />
        <TutorChat
          lessonTitle={mission?.title}
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
  planHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  adapt: { color: Palette.brandDeep, marginTop: Spacing.two },
  error: { color: Palette.danger },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.three, flexWrap: 'wrap' },
});
