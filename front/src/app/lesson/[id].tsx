import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkdownBody } from '@/components/markdown-body';
import { SourceRefs } from '@/components/source-refs';
import { ThemedText } from '@/components/themed-text';
import { TutorChat } from '@/components/tutor-chat';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
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
      setResultMsg('Ответьте на все вопросы ниже');
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

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.accent} />
          <ThemedText type="small" themeColor="textSecondary">
            Готовим урок…
          </ThemedText>
        </View>
      </Atmosphere>
    );
  }

  if (!lesson) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ThemedText type="small">{error || 'Урок не найден'}</ThemedText>
          <Button label="К курсу" variant="ghost" onPress={() => router.replace('/course')} />
        </View>
      </Atmosphere>
    );
  }

  const generating =
    lesson.status === 'generating' ||
    (lesson.status === 'locked' && lesson.blocks.length === 0);

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/course');
            }}
            hitSlop={10}
            style={styles.topLink}>
            <ThemedText type="link">← Курс</ThemedText>
          </Pressable>
          {!generating ? (
            <Pressable
              onPress={() => setTutorOpen(true)}
              hitSlop={10}
              style={({ pressed }) => [styles.askBtn, pressed && styles.askBtnPressed]}>
              <View style={styles.askDot} />
              <ThemedText type="smallBold" style={styles.askBtnText}>
                Спросить
              </ThemedText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <ThemedText type="label" themeColor="textSecondary">
              Урок {String(lesson.order_index).padStart(2, '0')}
            </ThemedText>
            <ThemedText type="title">{lesson.title}</ThemedText>
            {lesson.summary ? (
              <ThemedText type="small" themeColor="textSecondary">
                {lesson.summary}
              </ThemedText>
            ) : null}
          </View>

          {generating ? (
            <View style={styles.banner}>
              <ActivityIndicator color={Palette.accent} size="small" />
              <ThemedText type="small" themeColor="textSecondary">
                Собираем материал — обычно меньше минуты
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <ThemedText type="subtitle">Теория</ThemedText>
                <MarkdownBody content={theory} bare />
                {sourceCount > 0 ? (
                  <View style={styles.sourcesBlock}>
                    <Pressable onPress={() => setSourcesOpen((v) => !v)} style={styles.sourcesToggle}>
                      <ThemedText type="smallBold">
                        {sourcesOpen ? 'Скрыть источники' : `Источники · ${sourceCount}`}
                      </ThemedText>
                    </Pressable>
                    {sourcesOpen ? <SourceRefs refs={sourceRefs} /> : null}
                  </View>
                ) : null}
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <ThemedText type="subtitle">Практика</ThemedText>
                <MarkdownBody content={practice} bare />
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <View style={styles.quizHead}>
                  <ThemedText type="subtitle">Проверка</ThemedText>
                  {!score && lesson.quiz.length > 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      {answeredCount}/{lesson.quiz.length}
                    </ThemedText>
                  ) : null}
                </View>

                {score ? (
                  <View style={styles.scoreCard}>
                    <ThemedText type="title" style={styles.scoreValue}>
                      {score.score}/{score.total}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Урок пройден. Можно идти дальше.
                    </ThemedText>
                    <Button label="К курсу" onPress={() => router.replace('/course')} />
                  </View>
                ) : (
                  <View style={styles.quiz}>
                    {lesson.quiz.map((q, qIdx) => {
                      const options = Array.isArray(q.options) ? q.options : [];
                      return (
                        <View key={q.id} style={styles.question}>
                          <ThemedText type="smallBold">
                            {qIdx + 1}. {q.question}
                          </ThemedText>
                          {options.map((opt, idx) => {
                            const selected = answers[q.id] === idx;
                            return (
                              <Pressable
                                key={`${q.id}-${idx}`}
                                onPress={() =>
                                  setAnswers((prev) => ({ ...prev, [q.id]: idx }))
                                }
                                style={[styles.option, selected && styles.optionSelected]}>
                                <ThemedText type="small">{opt}</ThemedText>
                              </Pressable>
                            );
                          })}
                        </View>
                      );
                    })}
                    <Button
                      label={submitting ? 'Проверяем…' : 'Завершить урок'}
                      onPress={submitQuiz}
                      disabled={submitting || lesson.quiz.length === 0}
                    />
                    {resultMsg ? (
                      <ThemedText type="small" style={styles.error}>
                        {resultMsg}
                      </ThemedText>
                    ) : null}
                  </View>
                )}
              </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  topBar: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  topLink: { paddingVertical: 8 },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    backgroundColor: Palette.ink,
  },
  askBtnPressed: { opacity: 0.88 },
  askDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Palette.mint,
  },
  askBtnText: { color: '#fff' },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { gap: Spacing.two },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  section: { gap: Spacing.three },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Palette.line,
  },
  sourcesBlock: { gap: Spacing.two },
  sourcesToggle: { paddingVertical: 4 },
  quizHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  quiz: { gap: Spacing.four },
  question: { gap: Spacing.two },
  option: {
    borderWidth: 1.5,
    borderColor: Palette.line,
    borderRadius: Radius.md,
    padding: Spacing.three,
    backgroundColor: Palette.surface,
  },
  optionSelected: {
    borderColor: Palette.accent,
    backgroundColor: '#FFF4EF',
  },
  scoreCard: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  scoreValue: { color: Palette.mint },
  error: { color: Palette.danger },
});
