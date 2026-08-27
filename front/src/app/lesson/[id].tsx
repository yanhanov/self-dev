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

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { api, LessonDetail } from '@/lib/api';

type Tab = 'theory' | 'practice' | 'quiz';

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [tab, setTab] = useState<Tab>('theory');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function load() {
      try {
        const data = await api.getLesson(id!);
        if (cancelled) return;
        setLesson(data);
        setError(null);
        setLoading(false);
        if (data.status === 'generating' || (data.status === 'locked' && data.blocks.length === 0)) {
          timer = setInterval(async () => {
            const next = await api.getLesson(id!);
            setLesson(next);
            if (next.blocks.length > 0 && next.status !== 'generating') {
              clearInterval(timer);
            }
          }, 2000);
        }
      } catch (e) {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [id]);

  const theory = useMemo(
    () => lesson?.blocks.find((b) => b.block_type === 'theory')?.content_markdown || '',
    [lesson]
  );
  const practice = useMemo(
    () => lesson?.blocks.find((b) => b.block_type === 'practice')?.content_markdown || '',
    [lesson]
  );

  async function submitQuiz() {
    if (!lesson) return;
    const payload = lesson.quiz.map((q) => ({
      question_id: q.id,
      selected_index: answers[q.id] ?? -1,
    }));
    if (payload.some((a) => a.selected_index < 0)) {
      setResult('Ответьте на все вопросы');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.completeLesson(lesson.id, payload);
      setResult(`Готово: ${res.score}/${res.total}`);
      setTimeout(() => router.replace('/course'), 1200);
    } catch (e) {
      setResult(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.accent} />
          <ThemedText type="small">Генерируем урок…</ThemedText>
        </View>
      </Atmosphere>
    );
  }

  if (!lesson) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ThemedText type="small">{error || 'Урок не найден'}</ThemedText>
        </View>
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable onPress={() => router.back()}>
            <ThemedText type="link">← к курсу</ThemedText>
          </Pressable>

          <View style={styles.header}>
            <ThemedText type="label" themeColor="textSecondary">
              Урок {lesson.order_index}
            </ThemedText>
            <ThemedText type="title">{lesson.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {lesson.summary}
            </ThemedText>
          </View>

          <View style={styles.tabs}>
            {([
              ['theory', 'Теория'],
              ['practice', 'Практика'],
              ['quiz', 'Тест'],
            ] as const).map(([key, label]) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tab, tab === key && styles.tabActive]}>
                <ThemedText type="smallBold" style={tab === key ? styles.tabTextOn : undefined}>
                  {label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {tab === 'theory' ? <Body text={theory} /> : null}
          {tab === 'practice' ? <Body text={practice} /> : null}
          {tab === 'quiz' ? (
            <View style={styles.quiz}>
              {lesson.quiz.map((q) => {
                const options = Array.isArray(q.options) ? q.options : [];
                return (
                  <View key={q.id} style={styles.question}>
                    <ThemedText type="smallBold">{q.question}</ThemedText>
                    {options.map((opt, idx) => (
                      <Pressable
                        key={`${q.id}-${idx}`}
                        onPress={() => setAnswers((prev) => ({ ...prev, [q.id]: idx }))}
                        style={[
                          styles.option,
                          answers[q.id] === idx && styles.optionSelected,
                        ]}>
                        <ThemedText type="small">{opt}</ThemedText>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
              <Button
                label={submitting ? 'Проверяем…' : 'Завершить урок'}
                onPress={submitQuiz}
                disabled={submitting}
              />
              {result ? <ThemedText type="small">{result}</ThemedText> : null}
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

function Body({ text }: { text: string }) {
  return (
    <View style={styles.body}>
      <ThemedText type="default">{text || 'Контент ещё генерируется…'}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: Spacing.six,
  },
  header: { gap: Spacing.two },
  tabs: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.sm,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  tabActive: {
    backgroundColor: Palette.ink,
    borderColor: Palette.ink,
  },
  tabTextOn: {
    color: '#fff',
  },
  body: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
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
});
