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
import { Button } from '@/components/ui/button';
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
          <ActivityIndicator color={Palette.accent} />
        </View>
      </Atmosphere>
    );
  }

  if (!course) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ThemedText type="small">{error || 'Курс ещё не готов'}</ThemedText>
          <Button label="Пройти onboarding" onPress={() => router.replace('/onboarding')} />
        </View>
      </Atmosphere>
    );
  }

  const total = course.total_lessons || course.lessons.length || 1;
  const done = course.lessons.filter((l) => l.status === 'completed').length;
  const generating = course.generation_status !== 'ready';
  const pct = Math.round((done / total) * 100);

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
                delayRef.current = 2000;
                load();
              }}
              tintColor={Palette.accent}
            />
          }>
          <View style={styles.header}>
            <ThemedText type="label" themeColor="textSecondary">
              {course.profession_title} · {course.level_title}
            </ThemedText>
            <ThemedText type="title">{course.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {course.summary}
            </ThemedText>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressMeta}>
              <ThemedText type="smallBold">
                {done} из {total} · {pct}%
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {generating
                  ? generationStatusLabel(course.generation_status)
                  : done === total
                    ? 'курс пройден'
                    : 'в процессе'}
              </ThemedText>
            </View>
            <ProgressBar value={done} total={total} />
            {course.generation_status === 'failed' ? (
              <ThemedText type="small" style={styles.error}>
                Генерация не удалась. Пройдите onboarding ещё раз.
              </ThemedText>
            ) : null}
            {nextLesson &&
            (nextLesson.status === 'ready' || nextLesson.status === 'in_progress') ? (
              <Button
                label={`Продолжить: ${nextLesson.title}`}
                onPress={() => router.push(`/lesson/${nextLesson.id}`)}
              />
            ) : null}
          </View>

          <View style={styles.listHeader}>
            <ThemedText type="label" themeColor="textSecondary">
              Уроки
            </ThemedText>
          </View>

          <View style={styles.list}>
            {course.lessons.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                isCurrent={nextLesson?.id === lesson.id}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

function statusMeta(status: string): { label: string; color: string } {
  switch (status) {
    case 'completed':
      return { label: 'готово', color: Palette.success };
    case 'ready':
    case 'in_progress':
      return { label: 'открыт', color: Palette.accent };
    case 'generating':
      return { label: 'пишем…', color: Palette.mint };
    default:
      return { label: 'скоро', color: Palette.inkSoft };
  }
}

function LessonRow({
  lesson,
  isCurrent,
}: {
  lesson: LessonSummary;
  isCurrent: boolean;
}) {
  const locked = lesson.status === 'locked' || lesson.status === 'generating';
  const openable =
    lesson.status === 'ready' || lesson.status === 'in_progress' || lesson.status === 'completed';
  const meta = statusMeta(lesson.status);

  return (
    <Pressable
      disabled={!openable}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      style={({ pressed }) => [
        styles.lesson,
        isCurrent && styles.lessonCurrent,
        locked && styles.lessonLocked,
        pressed && openable && styles.lessonPressed,
      ]}>
              <View style={[styles.lessonIndex, isCurrent && styles.lessonIndexCurrent]}>
        <ThemedText
          type="smallBold"
          style={isCurrent ? styles.lessonIndexTextCurrent : undefined}>
          {String(lesson.order_index).padStart(2, '0')}
        </ThemedText>
      </View>
      <View style={styles.lessonCopy}>
        <ThemedText type="smallBold">{lesson.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {lesson.summary}
        </ThemedText>
      </View>
      <ThemedText type="label" style={{ color: meta.color, marginTop: 6 }}>
        {meta.label}
      </ThemedText>
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
    padding: Spacing.four,
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
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  listHeader: {
    marginTop: Spacing.one,
  },
  list: { gap: Spacing.two },
  lesson: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
    padding: Spacing.three,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  lessonCurrent: {
    borderColor: Palette.accent,
    backgroundColor: '#FFF8F5',
  },
  lessonPressed: {
    borderColor: Palette.ink,
  },
  lessonLocked: { opacity: 0.45 },
  lessonIndex: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8E0',
  },
  lessonIndexCurrent: {
    backgroundColor: Palette.accent,
  },
  lessonIndexTextCurrent: {
    color: '#fff',
  },
  lessonCopy: { flex: 1, gap: 4 },
  error: { color: Palette.danger },
});
