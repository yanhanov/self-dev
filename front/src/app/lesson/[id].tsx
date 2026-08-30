import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkdownBody } from '@/components/markdown-body';
import { SourceRefs } from '@/components/source-refs';
import { ThemedText } from '@/components/themed-text';
import { TutorChat } from '@/components/tutor-chat';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ProgressBar } from '@/components/ui/progress-bar';
import { HeaderInset, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { api, friendlyError, LessonDetail, SourceRef } from '@/lib/api';

function nextBackoff(ms: number) {
  return Math.min(ms * 2, 15000);
}

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let delay = 2000;

    async function load(poll: boolean) {
      try {
        const data = await api.getLesson(id!);
        if (cancelled) return;
        setLesson(data);
        setError(null);
        setLoading(false);

        const stillGenerating =
          data.status === 'generating' ||
          (data.status === 'locked' && data.blocks.length === 0);

        if (poll && stillGenerating) {
          timer = setTimeout(async () => {
            delay = nextBackoff(delay);
            await load(true);
          }, delay);
        }
      } catch (e) {
        if (!cancelled) {
          setError(friendlyError(e));
          setLoading(false);
        }
      }
    }

    load(true);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const theoryBlock = useMemo(
    () => lesson?.blocks.find((b) => b.block_type === 'theory'),
    [lesson]
  );
  const practiceBlock = useMemo(
    () => lesson?.blocks.find((b) => b.block_type === 'practice'),
    [lesson]
  );

  const theory = theoryBlock?.content_markdown || '';
  const practice = practiceBlock?.content_markdown || '';
  const sourceRefs = (theoryBlock?.source_refs || []) as SourceRef[];
  const sourceCount = Array.isArray(sourceRefs) ? sourceRefs.length : 0;

  const answeredCount = lesson
    ? lesson.quiz.filter((q) => answers[q.id] !== undefined).length
    : 0;

  async function submitQuiz() {
    if (!lesson) return;
    const payload = lesson.quiz.map((q) => ({
      question_id: q.id,
      selected_index: answers[q.id] ?? -1,
    }));
    if (payload.some((a) => a.selected_index < 0)) {
      setResultMsg('Ответьте на все вопросы');
      return;
    }
    setSubmitting(true);
    setResultMsg(null);
    try {
      const res = await api.completeLesson(lesson.id, payload);
      setScore({ score: res.score, total: res.total });
    } catch (e) {
      setResultMsg(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/course');
  }

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.brand} />
          <ThemedText type="small" themeColor="textSecondary">
            Открываем урок…
          </ThemedText>
        </View>
      </Atmosphere>
    );
  }

  if (!lesson) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ThemedText type="subtitle">Урок не найден</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {error || 'Попробуйте вернуться к программе курса.'}
          </ThemedText>
          <Button label="К курсу" onPress={() => router.replace('/course')} />
        </View>
      </Atmosphere>
    );
  }

  const generating =
    lesson.status === 'generating' ||
    (lesson.status === 'locked' && lesson.blocks.length === 0);

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.topBar}>
          <View style={styles.topInner}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Назад к курсу"
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
              <Icon name="back" size={20} color={Palette.ink} />
            </Pressable>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.topTitle}>
              {lesson.title}
            </ThemedText>
            {!generating ? (
              <Button
                label="Спросить"
                icon="chat"
                variant="secondary"
                onPress={() => setTutorOpen(true)}
              />
            ) : (
              <View style={styles.topSpacer} />
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <ThemedText type="meta" themeColor="textSecondary">
              Урок {lesson.order_index}
            </ThemedText>
            <ThemedText type="title" style={styles.lessonTitle}>
              {lesson.title}
            </ThemedText>
            {lesson.summary ? (
              <ThemedText type="small" themeColor="textSecondary">
                {lesson.summary}
              </ThemedText>
            ) : null}
          </Card>

          {generating ? (
            <Card>
              <View style={styles.generating}>
                <ActivityIndicator color={Palette.brand} />
                <ThemedText type="subtitle">Собираем материал</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Обычно это занимает меньше минуты. Страница обновится сама.
                </ThemedText>
              </View>
            </Card>
          ) : (
            <>
              <Card padded={false}>
                <SectionHead icon="book" title="Теория" />
                <Divider />
                <View style={styles.sectionBody}>
                  <MarkdownBody content={theory} bare />
                </View>
                {sourceCount > 0 ? (
                  <>
                    <Divider />
                    <Pressable
                      onPress={() => setSourcesOpen((v) => !v)}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.sourcesToggle, pressed && styles.rowPressed]}>
                      <Icon name="link" size={16} color={Palette.inkSoft} />
                      <ThemedText type="smallBold" themeColor="textSecondary">
                        {sourcesOpen ? 'Скрыть источники' : `Источники · ${sourceCount}`}
                      </ThemedText>
                    </Pressable>
                    {sourcesOpen ? (
                      <View style={styles.sourcesBody}>
                        <SourceRefs refs={sourceRefs} />
                      </View>
                    ) : null}
                  </>
                ) : null}
              </Card>

              <Card padded={false}>
                <SectionHead icon="grid" title="Практика" />
                <Divider />
                <View style={styles.sectionBody}>
                  <MarkdownBody content={practice} bare />
                </View>
              </Card>

              <Card padded={false}>
                <SectionHead
                  icon="checkCircle"
                  title="Проверка знаний"
                  meta={
                    !score && lesson.quiz.length > 0
                      ? `${answeredCount} из ${lesson.quiz.length}`
                      : undefined
                  }
                />
                <Divider />

                {score ? (
                  <View style={styles.scoreCard}>
                    <View style={styles.scoreIcon}>
                      <Icon name="checkCircle" size={28} color={Palette.success} />
                    </View>
                    <ThemedText type="headline">
                      {score.score} из {score.total}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                      Урок пройден. Можно двигаться дальше.
                    </ThemedText>
                    <Button
                      label="Вернуться к курсу"
                      size="lg"
                      onPress={() => router.replace('/course')}
                    />
                  </View>
                ) : (
                  <View style={styles.quiz}>
                    {lesson.quiz.length > 0 ? (
                      <ProgressBar value={answeredCount} total={lesson.quiz.length} />
                    ) : null}

                    {lesson.quiz.map((q, qIdx) => {
                      const options = Array.isArray(q.options) ? q.options : [];
                      return (
                        <View key={q.id} style={styles.question}>
                          <ThemedText type="smallBold">
                            {qIdx + 1}. {q.question}
                          </ThemedText>
                          <View style={styles.options}>
                            {options.map((opt, idx) => {
                              const selected = answers[q.id] === idx;
                              return (
                                <Pressable
                                  key={`${q.id}-${idx}`}
                                  accessibilityRole="radio"
                                  accessibilityState={{ selected }}
                                  onPress={() =>
                                    setAnswers((prev) => ({ ...prev, [q.id]: idx }))
                                  }
                                  style={({ pressed }) => [
                                    styles.option,
                                    selected && styles.optionSelected,
                                    pressed && !selected && styles.rowPressed,
                                  ]}>
                                  <View style={[styles.radio, selected && styles.radioOn]}>
                                    {selected ? <View style={styles.radioDot} /> : null}
                                  </View>
                                  <ThemedText type="small" style={styles.optionText}>
                                    {opt}
                                  </ThemedText>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}

                    {resultMsg ? (
                      <View style={styles.inlineError}>
                        <ThemedText type="small" style={styles.errorText}>
                          {resultMsg}
                        </ThemedText>
                      </View>
                    ) : null}

                    <Button
                      label={submitting ? 'Проверяем…' : 'Завершить урок'}
                      size="lg"
                      fullWidth
                      onPress={submitQuiz}
                      disabled={submitting || lesson.quiz.length === 0}
                    />
                  </View>
                )}
              </Card>
            </>
          )}
        </ScrollView>

        <TutorChat
          lessonId={lesson.id}
          lessonTitle={lesson.title}
          open={tutorOpen}
          onOpenChange={setTutorOpen}
        />
      </SafeAreaView>
    </Atmosphere>
  );
}

function SectionHead({
  icon,
  title,
  meta,
}: {
  icon: 'book' | 'grid' | 'checkCircle';
  title: string;
  meta?: string;
}) {
  return (
    <View style={styles.sectionHead}>
      <Icon name={icon} size={18} color={Palette.inkSoft} filled={false} />
      <ThemedText type="subtitle" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {meta ? (
        <ThemedText type="meta" themeColor="textSecondary">
          {meta}
        </ThemedText>
      ) : null}
    </View>
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
  centerText: { textAlign: 'center' },
  topBar: {
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    minHeight: HeaderInset,
    justifyContent: 'center',
  },
  topInner: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  topTitle: { flex: 1 },
  topSpacer: { width: 1 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: Palette.surfaceHover },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: Spacing.seven,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  lessonTitle: { marginTop: 2, marginBottom: Spacing.one },
  generating: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  sectionTitle: { flex: 1 },
  sectionBody: { padding: Spacing.four },
  sourcesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  sourcesBody: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  rowPressed: { backgroundColor: Palette.surfaceHover },
  quiz: {
    padding: Spacing.four,
    gap: Spacing.five,
  },
  question: { gap: Spacing.two },
  options: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderRadius: Radius.sm,
    padding: Spacing.three,
    backgroundColor: Palette.surface,
  },
  optionSelected: {
    borderColor: Palette.brand,
    backgroundColor: Palette.brandSoft,
  },
  optionText: { flex: 1 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Palette.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: Palette.brand },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.brand,
  },
  scoreCard: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
  },
  scoreIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.successSoft,
    marginBottom: Spacing.one,
  },
  inlineError: {
    padding: Spacing.three,
    borderRadius: Radius.xs,
    backgroundColor: Palette.dangerSoft,
  },
  errorText: { color: Palette.danger },
});
