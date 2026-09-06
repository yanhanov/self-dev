import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { AppShell } from '@/components/layout/app-shell';
import { MarkdownBody } from '@/components/markdown-body';
import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { api, friendlyError, UserProject } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function ProjectScreen() {
  const [project, setProject] = useState<UserProject | null>(null);
  const [sql, setSql] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    overall_score: number;
    feedback: string;
    readiness: { overall: number; gaps: { hint: string }[] };
  } | null>(null);

  const load = useCallback(async () => {
    const uid = await getStoredUserId();
    if (!uid) {
      router.replace('/onboarding');
      return;
    }
    try {
      const res = await api.getUserProject(uid);
      setProject(res.project);
      if (res.project?.sql_submission) setSql(res.project.sql_submission);
      if (res.project?.reasoning_text) setReasoning(res.project.reasoning_text);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    if (!project) return;
    const uid = await getStoredUserId();
    if (!uid) return;
    setBusy(true);
    setError(null);
    try {
      let sqlCorrect = false;
      if (project.challenge_slug) {
        const challenge = await api.getChallenge(project.challenge_slug);
        const grade = await api.gradeChallenge(uid, challenge.id, {
          submitted_sql: sql,
          result_rows: [],
        });
        sqlCorrect = grade.is_correct;
      }
      const res = await api.submitProject(uid, project.id, {
        sql_submission: sql,
        reasoning_text: reasoning,
        sql_correct: sqlCorrect,
      });
      setResult(res);
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
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

  if (!project) {
    return (
      <Atmosphere>
        <AppShell>
          <Card>
            <ThemedText type="subtitle">Проект ещё недоступен</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {error || 'Сначала выберите Data Analyst и пройдите миссии.'}
            </ThemedText>
          </Card>
        </AppShell>
      </Atmosphere>
    );
  }

  const locked = project.status === 'locked';

  return (
    <Atmosphere>
      <AppShell>
        <Card>
          <ThemedText type="title">{project.title}</ThemedText>
          <ThemedText type="meta" themeColor="textSecondary">
            Статус: {project.status}
          </ThemedText>
          <MarkdownBody content={project.brief_markdown} bare />
        </Card>

        {locked ? (
          <Card>
            <ThemedText type="small">
              Проект откроется после 2 завершённых миссий. Продолжайте Today's Mission.
            </ThemedText>
            <Button label="К миссии" onPress={() => router.push('/today')} />
          </Card>
        ) : (
          <Card>
            <ThemedText type="subtitle">1. SQL</ThemedText>
            <TextInput
              value={sql}
              onChangeText={setSql}
              multiline
              style={styles.sql}
              autoCapitalize="none"
              autoCorrect={false}
              textAlignVertical="top"
              editable={project.status !== 'scored'}
            />
            <ThemedText type="subtitle">2. Business reasoning</ThemedText>
            <TextInput
              value={reasoning}
              onChangeText={setReasoning}
              multiline
              style={styles.reason}
              textAlignVertical="top"
              editable={project.status !== 'scored'}
              placeholder="5–8 предложений: драйверы, гипотезы, рекомендации"
              placeholderTextColor={Palette.inkFaint}
            />
            {project.status !== 'scored' ? (
              <Button
                label={busy ? 'Оцениваем…' : 'Сдать проект'}
                size="lg"
                disabled={busy || !sql.trim() || reasoning.trim().length < 40}
                onPress={submit}
              />
            ) : null}
          </Card>
        )}

        {result || project.status === 'scored' ? (
          <Card>
            <ThemedText type="subtitle">Оценка</ThemedText>
            <ThemedText type="headline" style={styles.score}>
              {Math.round(result?.overall_score ?? project.overall_score ?? 0)}/100
            </ThemedText>
            <ThemedText type="small">
              {result?.feedback || project.ai_feedback}
            </ThemedText>
            {result?.readiness ? (
              <ThemedText type="small" themeColor="textSecondary">
                Career Readiness сейчас {Math.round(result.readiness.overall)}%
              </ThemedText>
            ) : null}
            <Button label="Смотреть прогресс" onPress={() => router.push('/progress')} />
          </Card>
        ) : null}

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </AppShell>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sql: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderRadius: Radius.xs,
    padding: Spacing.three,
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: Palette.ink,
    backgroundColor: Palette.surfaceAlt,
    marginVertical: Spacing.two,
  },
  reason: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    borderRadius: Radius.xs,
    padding: Spacing.three,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Palette.ink,
    backgroundColor: Palette.surface,
    marginVertical: Spacing.two,
  },
  score: { color: Palette.brand },
  error: { color: Palette.danger },
});
