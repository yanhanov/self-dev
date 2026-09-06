import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { MarkdownBody } from '@/components/markdown-body';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { api, friendlyError, PracticeChallenge, TodayMission } from '@/lib/api';
import { runPracticeQuery } from '@/lib/sql-runner';
import { getStoredUserId } from '@/store/user';

const PHASES = ['concept', 'guided', 'challenge', 'feedback'] as const;

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
    try {
      let rows: unknown[] = [];
      if (Platform.OS === 'web') {
        try {
          const executed = await runPracticeQuery(challenge.setup_sql, sql);
          rows = executed.rows;
          setPreview(JSON.stringify(rows.slice(0, 8), null, 2));
        } catch {
          // Server will execute SQL if client sandbox fails
        }
      }
      const grade = await api.gradeChallenge(userId, challenge.id, {
        submitted_sql: sql,
        result_rows: rows,
        user_mission_id: mission.id,
      });
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

  const phaseIdx = Math.max(0, PHASES.indexOf(mission.current_phase as (typeof PHASES)[number]));

  return (
    <View style={styles.wrap}>
      <View style={styles.phaseRow}>
        {PHASES.map((p, i) => (
          <View key={p} style={[styles.phaseDot, i <= phaseIdx && styles.phaseOn]} />
        ))}
      </View>
      <ThemedText type="title">{mission.title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Цель: {mission.goal} · ~{mission.estimated_minutes} мин · {mission.skill_title}
      </ThemedText>

      {mission.current_phase === 'concept' ? (
        <Card>
          <MarkdownBody content={mission.concept_markdown} bare />
          <Button
            label="К практике"
            size="lg"
            disabled={busy}
            onPress={() => advance({ phase: 'guided' })}
          />
        </Card>
      ) : null}

      {mission.current_phase === 'guided' ? (
        <Card>
          <MarkdownBody content={mission.guided_markdown} bare />
          <Button
            label="К challenge"
            size="lg"
            disabled={busy}
            onPress={() => advance({ phase: 'challenge' })}
          />
        </Card>
      ) : null}

      {mission.current_phase === 'challenge' && challenge ? (
        <Card>
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
            <ScrollView horizontal style={styles.preview}>
              <ThemedText type="meta" style={styles.mono}>
                {preview}
              </ThemedText>
            </ScrollView>
          ) : null}
          {localFeedback ? (
            <ThemedText type="small" style={styles.feedback}>
              {localFeedback}
            </ThemedText>
          ) : null}
          <Button label={busy ? 'Проверяем…' : 'Выполнить и проверить'} size="lg" onPress={runAndGrade} disabled={busy} />
        </Card>
      ) : null}

      {mission.current_phase === 'feedback' ? (
        <Card>
          <ThemedText type="subtitle">AI feedback</ThemedText>
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
        </Card>
      ) : null}

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
      {busy ? <ActivityIndicator color={Palette.brand} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three },
  phaseRow: { flexDirection: 'row', gap: 6 },
  phaseDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.line,
  },
  phaseOn: { backgroundColor: Palette.brand },
  sql: {
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
    maxHeight: 120,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: Radius.xs,
    padding: Spacing.two,
  },
  mono: { fontFamily: Fonts.mono },
  feedback: { color: Palette.brandDeep },
  error: { color: Palette.danger },
});
