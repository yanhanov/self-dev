import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { AppShell } from '@/components/layout/app-shell';
import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Palette, Spacing } from '@/constants/theme';
import { api, friendlyError } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

export default function ProgressScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getSkills>> | null>(null);
  const [roadmap, setRoadmap] = useState<Awaited<ReturnType<typeof api.getRoadmap>> | null>(null);

  const load = useCallback(async () => {
    const uid = await getStoredUserId();
    if (!uid) {
      router.replace('/onboarding');
      return;
    }
    try {
      const [skills, map] = await Promise.all([api.getSkills(uid), api.getRoadmap(uid)]);
      setData(skills);
      setRoadmap(map);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.brand} />
        </View>
      </Atmosphere>
    );
  }

  const r = data?.readiness;

  return (
    <Atmosphere>
      <AppShell
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={Palette.brand}
          />
        }>
        <Card>
          <ThemedText type="title">Career Readiness</ThemedText>
          <ThemedText type="headline" style={styles.big}>
            {r ? `${Math.round(r.overall)}%` : '—'}
          </ThemedText>
          {r ? (
            <View style={styles.stack}>
              <Metric label="Technical Skills" value={r.technical} />
              <Metric label="Projects" value={r.projects} />
              <Metric label="Practice consistency" value={r.consistency} />
            </View>
          ) : null}
        </Card>

        {r?.gaps?.length ? (
          <Card>
            <ThemedText type="subtitle">Закройте 2–3 пробела</ThemedText>
            {r.gaps.map((g) => (
              <ThemedText key={g.skill_slug} type="small" themeColor="textSecondary">
                · {g.hint}
              </ThemedText>
            ))}
            <Button label="Сегодняшняя миссия" onPress={() => router.push('/today')} />
          </Card>
        ) : null}

        <Card>
          <ThemedText type="subtitle">Skill graph</ThemedText>
          <View style={styles.stack}>
            {data?.skills.map((s) => (
              <View key={s.slug} style={styles.skill}>
                <View style={styles.skillHead}>
                  <ThemedText type="smallBold">{s.title}</ThemedText>
                  <ThemedText type="meta">{Math.round(s.score)}%</ThemedText>
                </View>
                <ProgressBar value={s.score} total={100} />
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <ThemedText type="subtitle">Почему такой маршрут</ThemedText>
          {roadmap?.modules
            .filter((m) => m.include)
            .slice(0, 8)
            .map((m) => (
              <View key={m.slug} style={styles.mod}>
                <ThemedText type="smallBold">{m.title}</ThemedText>
                <ThemedText type="meta" themeColor="textSecondary">
                  {m.why}
                </ThemedText>
              </View>
            ))}
        </Card>

        {error ? (
          <ThemedText type="small" style={styles.error}>
            {error}
          </ThemedText>
        ) : null}
      </AppShell>
    </Atmosphere>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.skill}>
      <View style={styles.skillHead}>
        <ThemedText type="meta">{label}</ThemedText>
        <ThemedText type="metaBold">{Math.round(value)}%</ThemedText>
      </View>
      <ProgressBar value={value} total={100} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  big: { color: Palette.brand, marginVertical: Spacing.two },
  stack: { gap: Spacing.three, marginTop: Spacing.three },
  skill: { gap: Spacing.one },
  skillHead: { flexDirection: 'row', justifyContent: 'space-between' },
  mod: { gap: 2, marginTop: Spacing.two },
  error: { color: Palette.danger },
});
