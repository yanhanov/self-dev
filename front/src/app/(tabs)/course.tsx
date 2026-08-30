import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Avatar } from '@/components/ui/avatar';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { api, Course, friendlyError, generationStatusLabel, LessonSummary } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function CourseScreen() {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const delayRef = useRef(2000);

  const load = useCallback(async () => {
    const uid = userId || (await getStoredUserId());
    if (!uid) {
      router.replace('/onboarding');
      return;
    }
    setUserId(uid);
    try {
      const data = await api.getCourse(uid);
      setCourse(data);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
      setCourse(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!course) return;
    if (course.generation_status === 'ready') return;
    if (course.generation_status === 'failed') return;

    const id = setTimeout(() => {
      delayRef.current = Math.min(delayRef.current * 2, 15000);
      load();
    }, delayRef.current);
    return () => clearTimeout(id);
  }, [course?.generation_status, load]);

  const nextLesson = useMemo(() => {
    if (!course) return null;
    return (
      course.lessons.find(
        (l) => l.status === 'ready' || l.status === 'in_progress' || l.status === 'generating'
      ) ||
      course.lessons.find((l) => l.status === 'locked') ||
      null
    );
  }, [course]);

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.brand} />
        </View>
      </Atmosphere>
    );
  }

  if (!course) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ThemedText type="subtitle">Курс ещё не готов</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {error || 'Пройдите короткую анкету — и мы соберём программу под вас.'}
          </ThemedText>
          <Button label="Начать" size="lg" onPress={() => router.replace('/onboarding')} />
        </View>
      </Atmosphere>
    );
  }

  const total = course.total_lessons || course.lessons.length || 1;
  const done = course.lessons.filter((l) => l.status === 'completed').length;
  const generating = course.generation_status !== 'ready';
  const pct = Math.round((done / total) * 100);
  const canContinue =
    nextLesson && (nextLesson.status === 'ready' || nextLesson.status === 'in_progress');

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                delayRef.current = 2000;
                load();
              }}
              tintColor={Palette.brand}
            />
          }>
          <Card padded={false}>
            <View style={styles.cover} />
            <View style={styles.profile}>
              <View style={styles.avatarWrap}>
                <Avatar label={course.profession_title} size={72} />
              </View>
              <ThemedText type="title">{course.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {course.profession_title} · {course.level_title}
              </ThemedText>
              {course.summary ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
                  {course.summary}
                </ThemedText>
              ) : null}

              <View style={styles.progressBlock}>
                <View style={styles.progressMeta}>
                  <ThemedText type="metaBold" themeColor="textSecondary">
                    {done} из {total} уроков
                  </ThemedText>
                  <ThemedText type="metaBold" style={styles.pct}>
                    {pct}%
                  </ThemedText>
                </View>
                <ProgressBar value={done} total={total} tone={done === total ? 'success' : 'brand'} />
              </View>

              {generating ? (
                <View style={styles.notice}>
                  <ActivityIndicator size="small" color={Palette.brand} />
                  <ThemedText type="small" themeColor="textSecondary" style={styles.noticeText}>
                    {generationStatusLabel(course.generation_status)}
                  </ThemedText>
                </View>
              ) : null}

              {course.generation_status === 'failed' ? (
                <View style={[styles.notice, styles.noticeError]}>
                  <ThemedText type="small" style={styles.errorText}>
                    Генерация не удалась. Попробуйте пройти анкету ещё раз.
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.actions}>
                {canContinue ? (
                  <Button
                    label="Продолжить обучение"
                    size="lg"
                    onPress={() => router.push(`/lesson/${nextLesson!.id}`)}
                  />
                ) : null}
                <Button
                  label="Изменить цель"
                  variant="secondary"
                  size="lg"
                  onPress={() => router.push('/onboarding')}
                />
              </View>
            </View>
          </Card>

          {canContinue ? (
            <Card padded={false}>
              <View style={styles.nextHead}>
                <ThemedText type="metaBold" themeColor="textSecondary">
                  Следующий шаг
                </ThemedText>
              </View>
              <Divider />
              <Pressable
                onPress={() => router.push(`/lesson/${nextLesson!.id}`)}
                style={({ pressed }) => [styles.nextBody, pressed && styles.rowPressed]}>
                <View style={styles.nextCopy}>
                  <ThemedText type="subtitle">{nextLesson!.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {nextLesson!.summary}
                  </ThemedText>
                </View>
                <Icon name="chevronRight" size={20} color={Palette.inkSoft} />
              </Pressable>
            </Card>
          ) : null}

          <Card padded={false}>
            <View style={styles.listHead}>
              <ThemedText type="subtitle">Программа курса</ThemedText>
              <ThemedText type="meta" themeColor="textSecondary">
                {total} уроков
              </ThemedText>
            </View>
            <Divider />
            {course.lessons.map((lesson, index) => (
              <View key={lesson.id}>
                {index > 0 ? <Divider style={styles.rowDivider} /> : null}
                <LessonRow lesson={lesson} isCurrent={nextLesson?.id === lesson.id} />
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

function statusMeta(status: string): { label: string; tone: BadgeTone } {
  switch (status) {
    case 'completed':
      return { label: 'Пройден', tone: 'success' };
    case 'ready':
    case 'in_progress':
      return { label: 'Доступен', tone: 'brand' };
    case 'generating':
      return { label: 'Готовим', tone: 'warning' };
    default:
      return { label: 'Закрыт', tone: 'neutral' };
  }
}

function LessonRow({ lesson, isCurrent }: { lesson: LessonSummary; isCurrent: boolean }) {
  const openable =
    lesson.status === 'ready' || lesson.status === 'in_progress' || lesson.status === 'completed';
  const completed = lesson.status === 'completed';
  const meta = statusMeta(lesson.status);

  return (
    <Pressable
      disabled={!openable}
      accessibilityRole="button"
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      style={({ pressed }) => [
        styles.row,
        isCurrent && styles.rowCurrent,
        pressed && openable && styles.rowPressed,
      ]}>
      <View
        style={[
          styles.rowIcon,
          completed && styles.rowIconDone,
          isCurrent && styles.rowIconCurrent,
        ]}>
        {completed ? (
          <Icon name="check" size={18} color={Palette.success} />
        ) : openable ? (
          <ThemedText type="metaBold" style={isCurrent ? styles.rowIndexOn : styles.rowIndex}>
            {lesson.order_index}
          </ThemedText>
        ) : (
          <Icon name="lock" size={16} color={Palette.inkFaint} />
        )}
      </View>

      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={!openable && styles.rowMuted}>
          {lesson.title}
        </ThemedText>
        <ThemedText type="meta" themeColor="textSecondary" numberOfLines={2}>
          {lesson.summary}
        </ThemedText>
        <Badge label={meta.label} tone={meta.tone} style={styles.rowBadge} />
      </View>

      {openable ? <Icon name="chevronRight" size={18} color={Palette.inkFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centerText: { textAlign: 'center', maxWidth: 320 },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.seven,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  cover: {
    height: 68,
    backgroundColor: Palette.brand,
  },
  profile: {
    padding: Spacing.four,
    paddingTop: 0,
    gap: Spacing.one,
  },
  avatarWrap: {
    marginTop: -36,
    marginBottom: Spacing.two,
    borderWidth: 3,
    borderColor: Palette.surface,
    borderRadius: Radius.sm + 3,
    alignSelf: 'flex-start',
  },
  summary: {
    marginTop: Spacing.one,
  },
  progressBlock: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pct: { color: Palette.brand },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.xs,
    backgroundColor: Palette.surfaceAlt,
  },
  noticeText: { flex: 1 },
  noticeError: { backgroundColor: Palette.dangerSoft },
  errorText: { color: Palette.danger, flex: 1 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  nextHead: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  nextBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  nextCopy: { flex: 1, gap: Spacing.one },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  rowDivider: { marginLeft: 64 },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  rowCurrent: {
    backgroundColor: Palette.brandSoft,
  },
  rowPressed: {
    backgroundColor: Palette.surfaceHover,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceAlt,
  },
  rowIconCurrent: { backgroundColor: Palette.brand },
  rowIconDone: { backgroundColor: Palette.successSoft },
  rowIndex: { color: Palette.inkSoft },
  rowIndexOn: { color: '#fff' },
  rowCopy: { flex: 1, gap: 2 },
  rowMuted: { color: Palette.inkSoft },
  rowBadge: { marginTop: Spacing.one },
});
