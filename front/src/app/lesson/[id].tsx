import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarkdownBody } from '@/components/markdown-body';
import { SourceRefs } from '@/components/source-refs';
import { ThemedText } from '@/components/themed-text';
import { TutorChat, TutorChatButton } from '@/components/tutor-chat';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Layout, Palette, Radius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { api, Course, friendlyError, LessonDetail, LessonSummary, SourceRef } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

type StepKey = 'theory' | 'practice' | 'quiz';
type Step = { key: StepKey; title: string; icon: IconName };

function nextBackoff(ms: number) {
  return Math.min(ms * 2, 15000);
}

function isOpenable(lesson?: LessonSummary) {
  return (
    !!lesson &&
    (lesson.status === 'ready' || lesson.status === 'in_progress' || lesson.status === 'completed')
  );
}

/**
 * The lesson runs as a wizard: theory, practice and the quiz each own the
 * screen, so the reader only ever sees one thing and always knows what comes
 * next. Quiz answers live here, so switching steps never loses them.
 */
export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isCompact } = useBreakpoint();

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [score, setScore] = useState<{ score: number; total: number } | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [stepKey, setStepKey] = useState<StepKey>('theory');

  const scrollRef = useRef<ScrollView>(null);

  const loadCourse = useCallback(async () => {
    const uid = await getStoredUserId();
    if (!uid) return;
    try {
      setCourse(await api.getCourse(uid));
    } catch {
      // Positioning is supplementary; the lesson still reads fine without it.
    }
  }, []);

  useEffect(() => {
    setLesson(null);
    setAnswers({});
    setScore(null);
    setResultMsg(null);
    setSourcesOpen(false);
    setTutorOpen(false);
    setStepKey('theory');
    setLoading(true);
  }, [id]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

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
          data.status === 'generating' || (data.status === 'locked' && data.blocks.length === 0);

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

  const theory =
    lesson?.blocks.find((b) => b.block_type === 'theory')?.content_markdown?.trim() || '';
  const practice =
    lesson?.blocks.find((b) => b.block_type === 'practice')?.content_markdown?.trim() || '';
  const sourceRefs = (lesson?.blocks.find((b) => b.block_type === 'theory')?.source_refs ||
    []) as SourceRef[];
  const sourceCount = Array.isArray(sourceRefs) ? sourceRefs.length : 0;

  const quiz = lesson?.quiz ?? [];

  const steps = useMemo<Step[]>(() => {
    const list: Step[] = [];
    if (theory) list.push({ key: 'theory', title: 'Теория', icon: 'article' });
    if (practice) list.push({ key: 'practice', title: 'Практика', icon: 'code' });
    if (quiz.length) list.push({ key: 'quiz', title: 'Проверка', icon: 'quiz' });
    return list;
  }, [theory, practice, quiz.length]);

  // A lesson may ship without theory or without a quiz; keep the pointer valid.
  useEffect(() => {
    if (!steps.length) return;
    if (!steps.some((s) => s.key === stepKey)) setStepKey(steps[0].key);
  }, [steps, stepKey]);

  const stepIndex = Math.max(
    steps.findIndex((s) => s.key === stepKey),
    0
  );
  const currentStep = steps[stepIndex];
  const prevStep = stepIndex > 0 ? steps[stepIndex - 1] : undefined;
  const nextStep = steps[stepIndex + 1];

  const goToStep = useCallback((key: StepKey) => {
    setStepKey(key);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []);

  const siblings = course?.lessons ?? [];
  const position = siblings.findIndex((l) => l.id === lesson?.id);
  const prevLesson = position > 0 ? siblings[position - 1] : undefined;
  const nextLesson = position >= 0 ? siblings[position + 1] : undefined;

  const answeredCount = quiz.filter((q) => answers[q.id] !== undefined).length;
  const allAnswered = quiz.length > 0 && answeredCount === quiz.length;

  async function submitQuiz() {
    if (!lesson) return;
    setSubmitting(true);
    setResultMsg(null);
    try {
      const res = await api.completeLesson(
        lesson.id,
        quiz.map((q) => ({ question_id: q.id, selected_index: answers[q.id] ?? -1 }))
      );
      setScore({ score: res.score, total: res.total });
      // Refresh so the unlocked next lesson becomes reachable right away.
      await loadCourse();
      scrollRef.current?.scrollTo({ y: 0, animated: true });
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
          <ThemedText type="headline">Урок не найден</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
            {error || 'Вернитесь к программе курса и выберите другой урок.'}
          </ThemedText>
          <Button label="К программе" size="lg" onPress={() => router.replace('/course')} />
        </View>
      </Atmosphere>
    );
  }

  const generating =
    lesson.status === 'generating' || (lesson.status === 'locked' && lesson.blocks.length === 0);
  const completed = lesson.status === 'completed' || !!score;
  const positionLabel = siblings.length
    ? `Урок ${lesson.order_index} из ${siblings.length}`
    : `Урок ${lesson.order_index}`;
  const isLastStep = !nextStep;

  const primaryAction = (() => {
    if (nextStep) {
      return {
        label: isCompact ? 'Далее' : `Далее: ${nextStep.title}`,
        onPress: () => goToStep(nextStep.key),
        disabled: false,
      };
    }
    if (score) {
      return nextLesson && isOpenable(nextLesson)
        ? {
            label: isCompact ? 'Следующий урок' : `Урок ${nextLesson.order_index}: далее`,
            onPress: () => router.replace(`/lesson/${nextLesson.id}`),
            disabled: false,
          }
        : { label: 'К программе', onPress: () => router.replace('/course'), disabled: false };
    }
    if (quiz.length) {
      return {
        label: submitting ? 'Проверяем…' : 'Завершить урок',
        onPress: submitQuiz,
        disabled: submitting || !allAnswered,
      };
    }
    return { label: 'К программе', onPress: () => router.replace('/course'), disabled: false };
  })();

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <Pressable
              onPress={goBack}
              accessibilityRole="button"
              accessibilityLabel="Назад к программе курса"
              style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Icon name="chevronLeft" size={20} color={Palette.ink} />
            </Pressable>

            <View style={styles.headerCopy}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {lesson.title}
              </ThemedText>
              <ThemedText type="meta" themeColor="textSecondary">
                {positionLabel}
                {steps.length > 1 && !generating
                  ? ` · Шаг ${stepIndex + 1} из ${steps.length}`
                  : ''}
              </ThemedText>
            </View>
          </View>

          {!generating && steps.length > 1 ? (
            <View style={styles.stepsRow}>
              {steps.map((step, index) => {
                const active = index === stepIndex;
                const passed = index < stepIndex;
                return (
                  <Pressable
                    key={step.key}
                    accessibilityRole="tab"
                    accessibilityLabel={`Шаг ${index + 1}: ${step.title}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => goToStep(step.key)}
                    style={({ pressed }) => [styles.step, pressed && styles.pressed]}>
                    <View
                      style={[
                        styles.stepBullet,
                        active && styles.stepBulletOn,
                        passed && styles.stepBulletPassed,
                      ]}>
                      {passed ? (
                        <Icon name="check" size={11} color="#fff" />
                      ) : (
                        <ThemedText
                          type="meta"
                          style={active ? styles.stepNumOn : styles.stepNum}>
                          {index + 1}
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText type="metaBold" style={active ? styles.stepTextOn : styles.stepText}>
                      {step.title}
                    </ThemedText>
                    {step.key === 'quiz' && !score ? (
                      <ThemedText type="meta" themeColor="textFaint">
                        {answeredCount}/{quiz.length}
                      </ThemedText>
                    ) : null}
                    <View style={[styles.stepUnderline, active && styles.stepUnderlineOn]} />
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.stage}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.content, isCompact && styles.contentCompact]}>
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
              ) : !steps.length ? (
                <Card>
                  <View style={styles.generating}>
                    <ThemedText type="subtitle">Материал пока пуст</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                      Для этого урока ещё нет содержимого. Вернитесь к программе курса.
                    </ThemedText>
                    <Button label="К программе" onPress={() => router.replace('/course')} />
                  </View>
                </Card>
              ) : (
                <>
                  {stepIndex === 0 ? (
                    <Card>
                      <ThemedText type="title">{lesson.title}</ThemedText>
                      {lesson.summary ? (
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          style={styles.lessonSummary}>
                          {lesson.summary}
                        </ThemedText>
                      ) : null}
                      {completed ? <Badge label="Пройден" tone="success" style={styles.heroBadge} /> : null}
                    </Card>
                  ) : null}

                  {stepKey === 'theory' ? (
                    <Card padded={false}>
                      <StepHead
                        icon="article"
                        title="Теория"
                        hint="Разберитесь с основой, дальше будет практика"
                      />
                      <Divider />
                      <View style={styles.stepBody}>
                        <MarkdownBody content={theory} bare />
                      </View>

                      {sourceCount > 0 ? (
                        <>
                          <Divider />
                          <Pressable
                            onPress={() => setSourcesOpen((v) => !v)}
                            accessibilityRole="button"
                            accessibilityState={{ expanded: sourcesOpen }}
                            style={({ pressed }) => [styles.sourcesToggle, pressed && styles.pressed]}>
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
                  ) : null}

                  {stepKey === 'practice' ? (
                    <Card padded={false}>
                      <StepHead
                        icon="code"
                        title="Практика"
                        hint="Сделайте задание, затем переходите к проверке"
                      />
                      <Divider />
                      <View style={styles.stepBody}>
                        <MarkdownBody content={practice} bare />
                      </View>
                    </Card>
                  ) : null}

                  {stepKey === 'quiz' ? (
                    <Card padded={false}>
                      <StepHead
                        icon="quiz"
                        title="Проверка знаний"
                        hint={
                          score
                            ? 'Результат сохранён'
                            : `Отвечено ${answeredCount} из ${quiz.length}`
                        }
                      />
                      <Divider />

                      {score ? (
                        <View style={styles.scoreCard}>
                          <View style={styles.scoreIcon}>
                            <Icon name="checkCircle" size={28} color={Palette.success} filled />
                          </View>
                          <ThemedText type="headline">
                            {score.score} из {score.total}
                          </ThemedText>
                          <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            style={styles.centerText}>
                            Урок пройден.{' '}
                            {nextLesson ? 'Следующий урок уже открыт.' : 'Это был последний урок.'}
                          </ThemedText>
                        </View>
                      ) : (
                        <View style={styles.quiz}>
                          {quiz.map((q, qIdx) => {
                            const options = Array.isArray(q.options) ? q.options : [];
                            const answered = answers[q.id] !== undefined;
                            return (
                              <View key={q.id} style={styles.question}>
                                <View style={styles.questionHead}>
                                  <View style={[styles.questionNum, answered && styles.questionNumOn]}>
                                    {answered ? (
                                      <Icon name="check" size={11} color="#fff" />
                                    ) : (
                                      <ThemedText type="meta" themeColor="textSecondary">
                                        {qIdx + 1}
                                      </ThemedText>
                                    )}
                                  </View>
                                  <ThemedText type="smallBold" style={styles.questionText}>
                                    {q.question}
                                  </ThemedText>
                                </View>

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
                                          pressed && !selected && styles.pressed,
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
                        </View>
                      )}
                    </Card>
                  ) : null}

                  {isLastStep && (prevLesson || nextLesson) ? (
                    <Card padded={false}>
                      <View style={styles.lessonNav}>
                        <NavLink lesson={prevLesson} direction="prev" label="Предыдущий урок" />
                        <NavLink lesson={nextLesson} direction="next" label="Следующий урок" />
                      </View>
                    </Card>
                  ) : null}
                </>
              )}
            </View>
          </ScrollView>

          {!generating ? (
            <TutorChat
              lessonId={lesson.id}
              lessonTitle={lesson.title}
              open={tutorOpen}
              onOpenChange={setTutorOpen}
            />
          ) : null}
        </View>

        {!generating && steps.length ? (
          <View style={styles.actionBar}>
            <View style={styles.actionBarInner}>
              {prevStep ? (
                <Button
                  label={isCompact ? 'Назад' : `Назад: ${prevStep.title}`}
                  variant="tertiary"
                  onPress={() => goToStep(prevStep.key)}
                />
              ) : (
                <View />
              )}

              <View style={styles.actionRight}>
                {!isCompact && currentStep?.key === 'quiz' && !score && !allAnswered ? (
                  <ThemedText type="meta" themeColor="textSecondary">
                    Ответьте на все вопросы
                  </ThemedText>
                ) : null}
                <TutorChatButton open={tutorOpen} onPress={() => setTutorOpen((v) => !v)} />
                <Button
                  label={primaryAction.label}
                  onPress={primaryAction.onPress}
                  disabled={primaryAction.disabled}
                />
              </View>
            </View>
          </View>
        ) : null}
      </SafeAreaView>
    </Atmosphere>
  );
}

function StepHead({ icon, title, hint }: { icon: IconName; title: string; hint?: string }) {
  return (
    <View style={styles.stepHead}>
      <View style={styles.stepHeadIcon}>
        <Icon name={icon} size={18} color={Palette.brand} />
      </View>
      <View style={styles.stepHeadCopy}>
        <ThemedText type="subtitle">{title}</ThemedText>
        {hint ? (
          <ThemedText type="meta" themeColor="textSecondary">
            {hint}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

function NavLink({
  lesson,
  direction,
  label,
}: {
  lesson?: LessonSummary;
  direction: 'prev' | 'next';
  label: string;
}) {
  const enabled = isOpenable(lesson);
  const isNext = direction === 'next';

  if (!lesson) return <View style={styles.navSpacer} />;

  return (
    <Pressable
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${lesson.title}`}
      onPress={() => router.replace(`/lesson/${lesson.id}`)}
      style={({ pressed }) => [
        styles.navLink,
        { alignItems: isNext ? 'flex-end' : 'flex-start' },
        pressed && enabled && styles.pressed,
        !enabled && styles.navLinkDisabled,
      ]}>
      <View style={styles.navLabel}>
        {!isNext ? <Icon name="chevronLeft" size={14} color={Palette.inkSoft} /> : null}
        <ThemedText type="meta" themeColor="textSecondary">
          {enabled ? label : 'Откроется позже'}
        </ThemedText>
        {isNext ? <Icon name="chevronRight" size={14} color={Palette.inkSoft} /> : null}
      </View>
      <ThemedText type="smallBold" numberOfLines={2} style={isNext ? styles.navTitleRight : undefined}>
        {lesson.title}
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
    padding: Spacing.five,
  },
  centerText: { textAlign: 'center', maxWidth: 380 },

  header: {
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  headerInner: {
    maxWidth: Layout.readWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: Layout.headerHeight,
  },
  headerCopy: { flex: 1, gap: 1 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: Palette.surfaceHover },

  stepsRow: {
    maxWidth: Layout.readWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  stepBullet: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceAlt,
    marginRight: 2,
  },
  stepBulletOn: { backgroundColor: Palette.brand },
  stepBulletPassed: { backgroundColor: Palette.success },
  stepNum: { color: Palette.inkSoft },
  stepNumOn: { color: '#fff' },
  stepText: { color: Palette.inkSoft },
  stepTextOn: { color: Palette.brand },
  stepUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    backgroundColor: 'transparent',
  },
  stepUnderlineOn: { backgroundColor: Palette.brand },

  /** Positioning context for the tutor launcher, which docks above the action bar. */
  stage: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    maxWidth: Layout.readWidth,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  contentCompact: { paddingHorizontal: Spacing.two },
  lessonSummary: { marginTop: Spacing.two },
  heroBadge: { marginTop: Spacing.three },
  generating: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
  },

  stepHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  stepHeadIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandSoft,
  },
  stepHeadCopy: { flex: 1, gap: 1 },
  stepBody: { padding: Spacing.four },
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

  quiz: {
    padding: Spacing.four,
    gap: Spacing.five,
  },
  question: { gap: Spacing.three },
  questionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  questionNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceAlt,
  },
  questionNumOn: { backgroundColor: Palette.success },
  questionText: { flex: 1 },
  options: { gap: Spacing.two, paddingLeft: 28 },
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
  inlineError: {
    padding: Spacing.three,
    borderRadius: Radius.xs,
    backgroundColor: Palette.dangerSoft,
  },
  errorText: { color: Palette.danger },

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

  lessonNav: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  navSpacer: { flex: 1 },
  navLink: {
    flex: 1,
    gap: 2,
    padding: Spacing.four,
  },
  navLinkDisabled: { opacity: 0.5 },
  navLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  navTitleRight: { textAlign: 'right' },

  actionBar: {
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  actionBarInner: {
    maxWidth: Layout.readWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  actionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexShrink: 1,
  },
});
