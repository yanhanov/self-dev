import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { MarkdownBody } from '@/components/markdown-body';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { api, friendlyError, PracticeChallenge, TodayMission } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

const PHASES = [
  { id: 'concept', label: 'Concept' },
  { id: 'guided', label: 'Practice' },
  { id: 'challenge', label: 'Challenge' },
  { id: 'feedback', label: 'Feedback' },
] as const;

type Props = {
  mission: TodayMission;
  onUpdated: (m: TodayMission) => void;
};

export function MissionPlayer({ mission, onUpdated }: Props) {
  const [challenge, setChallenge] = useState<PracticeChallenge | null>(null);
  const [sql, setSql] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    if (!mission.challenge_slug) return;
    api
      .getChallenge(mission.challenge_slug)
      .then((c) => {
        setChallenge(c);
        setSql(c.starter_sql || '');
      })
      .catch((e) => setError(friendlyError(e)));
  }, [mission.challenge_slug]);

  const advance = useCallback(
    async (body: Parameters<typeof api.advanceMission>[2]) => {
      const userId = await getStoredUserId();
      if (!userId) return;
      setBusy(true);
      setError(null);
      try {
        const res = (await api.advanceMission(userId, mission.id, body)) as {
          mission?: TodayMission;
          status?: string;
        };
        if (res.mission) onUpdated(res.mission);
        else if (body.complete) {
          onUpdated({ ...mission, status: 'completed', current_phase: 'feedback' });
        }
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy(false);
      }
    },
    [mission, onUpdated]
  );

  async function runAndGrade() {
    if (!challenge) return;
    const userId = await getStoredUserId();
    if (!userId) return;
    setBusy(true);
    setError(null);
    setLocalFeedback(null);
    setPreview('');
    try {
      const grade = await api.gradeChallenge(userId, challenge.id, {
        submitted_sql: sql,
        result_rows: [],
        user_mission_id: mission.id,
      });
      if (Array.isArray(grade.result_rows) && grade.result_rows.length) {
        setPreview(JSON.stringify(grade.result_rows.slice(0, 8), null, 2));
      }
      setLocalFeedback(grade.feedback);
      if (grade.is_correct) {
        await advance({ phase: 'feedback', challenge_passed: true, ai_feedback: grade.feedback });
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const phaseIdx = Math.max(
    0,
    PHASES.findIndex((p) => p.id === mission.current_phase)
  );

  return (
    <Card>
      <View style={styles.stack}>
        <View style={styles.phaseRow}>
          {PHASES.map((p, i) => {
            const on = i <= phaseIdx;
            return (
              <View key={p.id} style={styles.phaseItem}>
                <View style={[styles.phaseDot, on && styles.phaseOn]} />
                <ThemedText type="meta" style={on ? styles.phaseLabelOn : styles.phaseLabel}>
                  {p.label}
                </ThemedText>
              </View>
            );
          })}
        </View>

        <View style={styles.header}>
          <ThemedText type="title">{mission.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Цель: {mission.goal}
          </ThemedText>
          <ThemedText type="meta" themeColor="textSecondary">
            ~{mission.estimated_minutes} мин · {mission.skill_title}
          </ThemedText>
        </View>

        {mission.current_phase === 'concept' ? (
          <View style={styles.section}>
            <View style={styles.markdownWrap}>
              <MarkdownBody content={mission.concept_markdown} bare />
            </View>
            <Button
              label="К практике"
              size="lg"
              disabled={busy}
              onPress={() => advance({ phase: 'guided' })}
            />
          </View>
        ) : null}

        {mission.current_phase === 'guided' ? (
          <View style={styles.section}>
            <View style={styles.markdownWrap}>
              <MarkdownBody content={mission.guided_markdown} bare />
            </View>
            <Button
              label="К challenge"
              size="lg"
              disabled={busy}
              onPress={() => advance({ phase: 'challenge' })}
            />
          </View>
        ) : null}

        {mission.current_phase === 'challenge' && challenge ? (
          <View style={styles.section}>
            <ThemedText type="subtitle">{challenge.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {challenge.prompt}
            </ThemedText>
            <TextInput
              value={sql}
              onChangeText={setSql}
              multiline
              style={styles.sql}
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
            />
            {preview ? (
              <View style={styles.preview}>
                <ThemedText type="meta" style={styles.mono}>
                  {preview}
                </ThemedText>
              </View>
            ) : null}
            {localFeedback ? (
              <ThemedText type="small" style={styles.feedback}>
                {localFeedback}
              </ThemedText>
            ) : null}
            <Button
              label={busy ? 'Проверяем…' : 'Выполнить и проверить'}
              size="lg"
              onPress={runAndGrade}
              disabled={busy}
            />
          </View>
        ) : null}

        {mission.current_phase === 'challenge' && !challenge ? (
          <View style={styles.section}>
            <ActivityIndicator color={Palette.brand} />
            <ThemedText type="small" themeColor="textSecondary">
              Загружаем challenge…
            </ThemedText>
          </View>
        ) : null}

        {mission.current_phase === 'feedback' ? (
          <View style={styles.section}>
            <ThemedText type="subtitle">Feedback</ThemedText>
            <ThemedText type="small">
              {mission.ai_feedback || localFeedback || 'Отличная работа — миссия почти завершена.'}
            </ThemedText>
            <Button
              label={busy ? 'Сохраняем…' : 'Завершить миссию'}
              size="lg"
              disabled={busy}
              onPress={() =>
                advance({
                  complete: true,
                  challenge_passed: mission.challenge_passed || !!localFeedback,
                  ai_feedback: mission.ai_feedback || localFeedback || undefined,
                })
              }
            />
          </View>
        ) : null}

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.four,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    width: '100%',
  },
  phaseItem: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  phaseDot: {
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.line,
    width: '100%',
  },
  phaseOn: { backgroundColor: Palette.brand },
  phaseLabel: { color: Palette.inkFaint },
  phaseLabelOn: { color: Palette.inkSoft },
  header: {
    width: '100%',
    flexDirection: 'column',
    gap: Spacing.one,
  },
  section: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  markdownWrap: {
    width: '100%',
    marginBottom: Spacing.one,
  },
  sql: {
    width: '100%',
    minHeight: 140,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderRadius: Radius.xs,
    padding: Spacing.three,
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Palette.ink,
    backgroundColor: Palette.surfaceAlt,
  },
  preview: {
    width: '100%',
    maxHeight: 140,
    overflow: 'hidden',
    backgroundColor: Palette.surfaceAlt,
    borderRadius: Radius.xs,
    padding: Spacing.two,
  },
  mono: { fontFamily: Fonts.mono },
  feedback: { color: Palette.brandDeep },
  error: { color: Palette.danger },
});
