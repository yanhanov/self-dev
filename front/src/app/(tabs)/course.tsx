import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { CourseRail, nextOpenLesson } from '@/components/course-rail';
import { AppShell } from '@/components/layout/app-shell';
import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { api, Course, friendlyError, generationStatusLabel, LessonSummary } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

const SEARCH_THRESHOLD = 6;

export default function CourseScreen() {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
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
    if (course.generation_status === 'ready' || course.generation_status === 'failed') return;

    const id = setTimeout(() => {
      delayRef.current = Math.min(delayRef.current * 2, 15000);
      load();
    }, delayRef.current);
    return () => clearTimeout(id);
  }, [course?.generation_status, load]);

  const next = useMemo(() => nextOpenLesson(course), [course]);

  const filtered = useMemo(() => {
    if (!course) return [];
    const q = query.trim().toLowerCase();
    if (!q) return course.lessons;
    return course.lessons.filter(
      (l) =>
        l.title.toLowerCase().includes(q) || (l.summary || '').toLowerCase().includes(q)
    );
  }, [course, query]);

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
          <ThemedText type="headline">Курс ещё не собран</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {error || 'Пройдите короткую анкету — и мы составим программу под вашу цель.'}
          </ThemedText>
          <Button label="Начать" size="lg" onPress={() => router.replace('/onboarding')} />
        </View>
      </Atmosphere>
    );
  }

  const total = course.total_lessons || course.lessons.length || 0;
  const generating = course.generation_status !== 'ready';
  const showSearch = course.lessons.length > SEARCH_THRESHOLD;

  return (
    <Atmosphere>
      <AppShell
        aside={<CourseRail course={course} showContinue={false} />}
        asideFirstOnCompact
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
        {course.summary ? (
          <Card>
            <ThemedText type="metaBold" themeColor="textSecondary">
              О курсе
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.summary}>
              {course.summary}
            </ThemedText>
          </Card>
        ) : null}

        {generating ? (
          <Card>
            <View style={styles.notice}>
              <ActivityIndicator size="small" color={Palette.brand} />
              <View style={styles.noticeCopy}>
                <ThemedText type="smallBold">
                  {generationStatusLabel(course.generation_status)}
                </ThemedText>
                <ThemedText type="meta" themeColor="textSecondary">
                  Уроки появляются по мере готовности — страница обновится сама.
                </ThemedText>
              </View>
            </View>
          </Card>
        ) : null}

        {course.generation_status === 'failed' ? (
          <Card>
            <View style={styles.noticeError}>
              <ThemedText type="smallBold" style={styles.errorText}>
                Не удалось собрать курс
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Попробуйте обновить страницу или пройти анкету ещё раз.
              </ThemedText>
              <View style={styles.errorActions}>
                <Button label="Обновить" variant="secondary" onPress={load} />
                <Button
                  label="Пройти анкету"
                  variant="tertiary"
                  onPress={() => router.push('/onboarding')}
                />
              </View>
            </View>
          </Card>
        ) : null}

        {next ? (
          <Card padded={false}>
            <View style={styles.nextHead}>
              <Icon name="play" size={16} color={Palette.brand} filled />
              <ThemedText type="metaBold" style={styles.brandText}>
                Продолжить с урока {next.order_index}
              </ThemedText>
            </View>
            <Divider />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/lesson/${next.id}`)}
              style={({ pressed }) => [styles.nextBody, pressed && styles.pressed]}>
              <View style={styles.nextCopy}>
                <ThemedText type="subtitle">{next.title}</ThemedText>
                {next.summary ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {next.summary}
                  </ThemedText>
                ) : null}
              </View>
              <Icon name="chevronRight" size={20} color={Palette.inkSoft} />
            </Pressable>
          </Card>
        ) : null}

        <Card padded={false}>
          <View style={styles.listHead}>
            <View style={styles.listTitle}>
              <ThemedText type="subtitle">Программа</ThemedText>
              <ThemedText type="meta" themeColor="textSecondary">
                {total} {pluralLessons(total)}
              </ThemedText>
            </View>

            {showSearch ? (
              <View style={styles.search}>
                <Icon name="search" size={16} color={Palette.inkSoft} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Найти урок"
                  placeholderTextColor={Palette.inkFaint}
                  style={styles.searchInput}
                  accessibilityLabel="Поиск по урокам"
                  returnKeyType="search"
                />
                {query ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Очистить поиск"
                    onPress={() => setQuery('')}
                    hitSlop={8}>
                    <Icon name="close" size={14} color={Palette.inkSoft} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>

          <Divider />

          {filtered.length === 0 ? (
            <View style={styles.emptyList}>
              <ThemedText type="small" themeColor="textSecondary">
                {query ? `Ничего не найдено по запросу «${query}»` : 'Уроки скоро появятся'}
              </ThemedText>
            </View>
          ) : (
            filtered.map((lesson, index) => (
              <View key={lesson.id}>
                {index > 0 ? <Divider style={styles.rowDivider} /> : null}
                <LessonRow lesson={lesson} isNext={next?.id === lesson.id} />
              </View>
            ))
          )}
        </Card>
      </AppShell>
    </Atmosphere>
  );
}

function pluralLessons(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'урок';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'урока';
  return 'уроков';
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
      return { label: 'Откроется позже', tone: 'neutral' };
  }
}

function LessonRow({ lesson, isNext }: { lesson: LessonSummary; isNext: boolean }) {
  const openable =
    lesson.status === 'ready' || lesson.status === 'in_progress' || lesson.status === 'completed';
  const completed = lesson.status === 'completed';
  const meta = statusMeta(lesson.status);

  return (
    <Pressable
      disabled={!openable}
      accessibilityRole="button"
      accessibilityLabel={`Урок ${lesson.order_index}: ${lesson.title}. ${meta.label}`}
      onPress={() => router.push(`/lesson/${lesson.id}`)}
      style={({ pressed }) => [styles.row, pressed && openable && styles.pressed]}>
      <View style={[styles.rowIcon, completed && styles.rowIconDone, isNext && styles.rowIconNext]}>
        {completed ? (
          <Icon name="check" size={16} color={Palette.success} />
        ) : openable ? (
          <ThemedText type="metaBold" style={isNext ? styles.rowIndexOn : styles.rowIndex}>
            {lesson.order_index}
          </ThemedText>
        ) : (
          <Icon name="lock" size={14} color={Palette.inkFaint} />
        )}
      </View>

      <View style={styles.rowCopy}>
        <ThemedText type="smallBold" style={!openable ? styles.rowMuted : undefined}>
          {lesson.title}
        </ThemedText>
        {lesson.summary ? (
          <ThemedText type="meta" themeColor="textSecondary" numberOfLines={2}>
            {lesson.summary}
          </ThemedText>
        ) : null}
        <Badge label={meta.label} tone={meta.tone} style={styles.rowBadge} />
      </View>

      {openable ? <Icon name="chevronRight" size={16} color={Palette.inkFaint} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
  },
  centerText: { textAlign: 'center', maxWidth: 340 },
  summary: { marginTop: Spacing.one },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  noticeCopy: { flex: 1, gap: 2 },
  noticeError: { gap: Spacing.two },
  errorActions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  errorText: { color: Palette.danger },
  brandText: { color: Palette.brand },
  nextHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
    padding: Spacing.four,
    gap: Spacing.three,
  },
  listTitle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    height: 36,
    borderRadius: Radius.xs,
    backgroundColor: Palette.surfaceAlt,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Palette.ink,
    fontFamily: Fonts.sans,
    // The field already reads as focused via its container; drop the double ring.
    ...(Platform.select({ web: { outlineStyle: 'none' }, default: {} }) as object),
  },
  emptyList: {
    padding: Spacing.four,
  },
  rowDivider: { marginLeft: 60 },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  pressed: { backgroundColor: Palette.surfaceHover },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceAlt,
  },
  rowIconNext: { backgroundColor: Palette.brand },
  rowIconDone: { backgroundColor: Palette.successSoft },
  rowIndex: { color: Palette.inkSoft },
  rowIndexOn: { color: '#fff' },
  rowCopy: { flex: 1, gap: 2 },
  rowMuted: { color: Palette.inkSoft },
  rowBadge: { marginTop: Spacing.one },
});
