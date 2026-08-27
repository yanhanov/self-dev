import { useCallback, useEffect, useState } from 'react';
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
import { api, Course, LessonSummary } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function CourseScreen() {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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
      setError(String(e));
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!course) return;
    if (course.generation_status === 'ready') return;
    if (course.generation_status === 'failed') return;

    const id = setInterval(() => {
      load();
    }, 2000);
    return () => clearInterval(id);
  }, [course?.generation_status, load]);

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

  const done = course.lessons.filter((l) => l.status === 'completed').length;
  const generating = course.generation_status !== 'ready';

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={false} onRefresh={load} tintColor={Palette.accent} />
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
                {done} / {course.total_lessons || course.lessons.length}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {generating ? `AI: ${course.generation_status}` : 'в процессе'}
              </ThemedText>
            </View>
            <ProgressBar value={done} total={course.total_lessons || course.lessons.length || 1} />
            {course.generation_status === 'failed' ? (
              <ThemedText type="small" style={styles.error}>
                Генерация не удалась. Пройдите onboarding ещё раз.
              </ThemedText>
            ) : null}
          </View>

          <View style={styles.list}>
            {course.lessons.map((lesson) => (
              <LessonRow key={lesson.id} lesson={lesson} />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

function statusLabel(status: string) {
  switch (status) {
    case 'completed':
      return 'готово';
    case 'ready':
    case 'in_progress':
      return 'открыт';
    case 'generating':
      return 'пишем…';
    default:
      return 'скоро';
  }
}

function LessonRow({ lesson }: { lesson: LessonSummary }) {
  const locked = lesson.status === 'locked' || lesson.status === 'generating';
  const openable =
    lesson.status === 'ready' || lesson.status === 'in_progress' || lesson.status === 'completed';

  return (
    <Pressable
      disabled={!openable}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      style={({ pressed }) => [
        styles.lesson,
        locked && styles.lessonLocked,
        pressed && openable && styles.lessonPressed,
      ]}>
      <View style={styles.lessonIndex}>
        <ThemedText type="smallBold">{String(lesson.order_index).padStart(2, '0')}</ThemedText>
      </View>
      <View style={styles.lessonCopy}>
        <ThemedText type="smallBold">{lesson.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {lesson.summary}
        </ThemedText>
      </View>
      <ThemedText type="label" style={styles.lessonStatus}>
        {statusLabel(lesson.status)}
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
  lessonPressed: {
    borderColor: Palette.ink,
  },
  lessonLocked: { opacity: 0.45 },
  lessonIndex: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8E0',
  },
  lessonCopy: { flex: 1, gap: 4 },
  lessonStatus: {
    color: Palette.mint,
    marginTop: 6,
  },
  error: { color: Palette.danger },
});
