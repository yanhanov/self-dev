import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Choice } from '@/components/ui/choice';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Palette, Spacing } from '@/constants/theme';
import { api, friendlyError } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

type Item = {
  id: string;
  order_index: number;
  prompt: string;
  options: string[];
  skill_slug: string;
  skill_title: string;
};

export default function AssessmentScreen() {
  const [items, setItems] = useState<Item[]>([]);
  const [title, setTitle] = useState('Проверка навыков');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    overall_score: number;
    skill_scores: Record<string, number>;
    roadmap_preview: { title: string; skill: string; intensity: string; score: number | null }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = await getStoredUserId();
        if (!userId) {
          router.replace('/onboarding');
          return;
        }
        const data = await api.getAssessment('data_analyst');
        setTitle(data.assessment.title);
        setItems(
          data.items.map((i) => ({
            ...i,
            options: Array.isArray(i.options) ? i.options : [],
          }))
        );
        const started = await api.startAssessment(userId, data.assessment.slug);
        setAttemptId(started.attempt_id);
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const current = items[idx];

  const skillBars = useMemo(() => {
    if (!result) return [];
    return Object.entries(result.skill_scores).map(([slug, score]) => ({ slug, score }));
  }, [result]);

  async function submitAll() {
    const userId = await getStoredUserId();
    if (!userId || !attemptId) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = items.map((item) => ({
        item_id: item.id,
        selected_index: answers[item.id],
      }));
      const res = await api.submitAssessment(userId, attemptId, payload);
      setResult(res);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.brand} />
        </View>
      </Atmosphere>
    );
  }

  if (result) {
    return (
      <Atmosphere>
        <SafeAreaView style={styles.safe}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <ThemedText type="title">Ваш skill graph</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Общий результат: {Math.round(result.overall_score)}%. Дальше — персональный roadmap по
              пробелам.
            </ThemedText>
            <Card>
              <View style={styles.stack}>
                {skillBars.map((s) => (
                  <View key={s.slug} style={styles.skillRow}>
                    <View style={styles.skillHead}>
                      <ThemedText type="smallBold">{s.slug}</ThemedText>
                      <ThemedText type="meta">{Math.round(s.score)}%</ThemedText>
                    </View>
                    <ProgressBar value={s.score} total={100} />
                  </View>
                ))}
              </View>
            </Card>
            <ThemedText type="subtitle">Что будет в маршруте</ThemedText>
            {result.roadmap_preview.slice(0, 6).map((m) => (
              <Card key={m.title}>
                <ThemedText type="smallBold">{m.title}</ThemedText>
                <ThemedText type="meta" themeColor="textSecondary">
                  {m.skill} · {m.intensity}
                  {m.score != null ? ` · сейчас ${Math.round(m.score)}%` : ''}
                </ThemedText>
              </Card>
            ))}
            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
            <Button
              label="Собрать мой курс"
              size="lg"
              onPress={() => router.replace('/course')}
            />
          </ScrollView>
        </SafeAreaView>
      </Atmosphere>
    );
  }

  if (!current) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ThemedText type="headline">{error || 'Нет вопросов'}</ThemedText>
        </View>
      </Atmosphere>
    );
  }

  const selected = answers[current.id];

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <ThemedText type="meta" themeColor="textSecondary">
            {title}
          </ThemedText>
          <ThemedText type="metaBold">
            {idx + 1} / {items.length}
          </ThemedText>
          <ProgressBar value={Object.keys(answers).length} total={items.length || 1} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          <ThemedText type="meta" themeColor="textSecondary">
            {current.skill_title}
          </ThemedText>
          <ThemedText type="title">{current.prompt}</ThemedText>
          <View style={styles.stack}>
            {current.options.map((opt, i) => (
              <Choice
                key={`${current.id}-${i}`}
                selected={selected === i}
                title={opt}
                onPress={() => setAnswers((a) => ({ ...a, [current.id]: i }))}
              />
            ))}
          </View>
          {error ? (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>
        <View style={styles.footer}>
          <Button
            label="Назад"
            variant="tertiary"
            size="lg"
            onPress={() => setIdx((v) => Math.max(0, v - 1))}
            disabled={idx === 0}
          />
          {idx < items.length - 1 ? (
            <Button
              label="Далее"
              size="lg"
              disabled={selected === undefined}
              onPress={() => setIdx((v) => v + 1)}
            />
          ) : (
            <Button
              label={submitting ? 'Считаем…' : 'Завершить'}
              size="lg"
              disabled={selected === undefined || submitting}
              onPress={submitAll}
            />
          )}
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    padding: Spacing.four,
    gap: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  stack: { gap: Spacing.two },
  skillRow: { gap: Spacing.one },
  skillHead: { flexDirection: 'row', justifyContent: 'space-between' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.four,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  error: { color: Palette.danger },
});
