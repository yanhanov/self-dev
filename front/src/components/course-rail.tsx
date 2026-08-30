import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Avatar } from '@/components/ui/avatar';
import { Card, Divider } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Palette, Radius, Spacing } from '@/constants/theme';
import type { Course, LessonSummary } from '@/lib/api';

type Props = {
  course: Course | null;
  /** Hidden on the screen that already owns this action. */
  showContinue?: boolean;
};

function courseProgress(course: Course | null) {
  if (!course) return { done: 0, total: 0, pct: 0 };
  const total = course.total_lessons || course.lessons.length || 0;
  const done = course.lessons.filter((l) => l.status === 'completed').length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function nextOpenLesson(course: Course | null): LessonSummary | null {
  if (!course) return null;
  return (
    course.lessons.find((l) => l.status === 'ready' || l.status === 'in_progress') ?? null
  );
}

/** Identity + progress + shortcuts: the app's persistent orientation panel. */
export function CourseRail({ course, showContinue = true }: Props) {
  const { done, total, pct } = courseProgress(course);
  const next = nextOpenLesson(course);

  return (
    <View style={styles.wrap}>
      <Card padded={false}>
        <View style={styles.cover} />
        <View style={styles.identity}>
          <View style={styles.avatarWrap}>
            <Avatar label={course?.profession_title || 'SelfDev'} size={56} />
          </View>
          <ThemedText type="subtitle" numberOfLines={2}>
            {course?.title || 'Ваш курс'}
          </ThemedText>
          {course ? (
            <ThemedText type="meta" themeColor="textSecondary">
              {course.profession_title} · {course.level_title}
            </ThemedText>
          ) : null}
        </View>

        {total > 0 ? (
          <>
            <Divider />
            <View style={styles.progress}>
              <View style={styles.progressRow}>
                <ThemedText type="meta" themeColor="textSecondary">
                  Пройдено {done} из {total}
                </ThemedText>
                <ThemedText type="metaBold" style={styles.pct}>
                  {pct}%
                </ThemedText>
              </View>
              <ProgressBar value={done} total={total} tone={done === total ? 'success' : 'brand'} />
            </View>
          </>
        ) : null}

        {showContinue && next ? (
          <>
            <Divider />
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/lesson/${next.id}`)}
              style={({ pressed }) => [styles.continue, pressed && styles.pressed]}>
              <Icon name="play" size={18} color={Palette.brand} filled />
              <View style={styles.continueCopy}>
                <ThemedText type="metaBold" style={styles.brandText}>
                  Продолжить
                </ThemedText>
                <ThemedText type="meta" themeColor="textSecondary" numberOfLines={1}>
                  {next.title}
                </ThemedText>
              </View>
            </Pressable>
          </>
        ) : null}
      </Card>

      <Card padded={false}>
        <RailLink icon="home" label="План на сегодня" onPress={() => router.push('/today')} />
        <Divider />
        <RailLink icon="cap" label="Программа курса" onPress={() => router.push('/course')} />
        <Divider />
        <RailLink icon="user" label="Изменить цель" onPress={() => router.push('/onboarding')} />
      </Card>
    </View>
  );
}

function RailLink({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({ pressed }) => [styles.railLink, pressed && styles.pressed]}>
      <Icon name={icon} size={18} color={Palette.inkSoft} />
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.railLabel}>
        {label}
      </ThemedText>
      <Icon name="chevronRight" size={16} color={Palette.inkFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  cover: {
    height: 54,
    backgroundColor: Palette.brand,
  },
  identity: {
    padding: Spacing.four,
    paddingTop: 0,
    gap: 2,
  },
  avatarWrap: {
    marginTop: -28,
    marginBottom: Spacing.two,
    borderWidth: 3,
    borderColor: Palette.surface,
    borderRadius: Radius.sm + 3,
    alignSelf: 'flex-start',
  },
  progress: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  pct: { color: Palette.brand },
  continue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  continueCopy: { flex: 1, gap: 1 },
  brandText: { color: Palette.brand },
  railLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  railLabel: { flex: 1 },
  pressed: { backgroundColor: Palette.surfaceHover },
});
