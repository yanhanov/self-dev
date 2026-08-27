import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Button } from '@/components/ui/button';
import { Choice } from '@/components/ui/choice';
import { FieldInput } from '@/components/ui/field-input';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { api, Profession, SkillLevel } from '@/lib/api';
import { setStoredUser } from '@/store/user';

type Step = 0 | 1 | 2;

const HOUR_OPTIONS = [5, 8, 12, 20];

export default function OnboardingScreen() {
  const [step, setStep] = useState<Step>(0);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [levels, setLevels] = useState<SkillLevel[]>([]);
  const [professionSlug, setProfessionSlug] = useState<string | null>(null);
  const [levelSlug, setLevelSlug] = useState<string | null>(null);
  const [weeklyHours, setWeeklyHours] = useState(12);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getProfessions(), api.getSkillLevels()])
      .then(([p, l]) => {
        setProfessions(p);
        setLevels(l);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const selectedProfession = useMemo(
    () => professions.find((p) => p.slug === professionSlug),
    [professions, professionSlug]
  );

  async function onSubmit() {
    if (!professionSlug || !levelSlug || !email.trim()) {
      setError('Заполните email и предыдущие шаги');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const user = await api.createUser(email.trim(), name.trim() || undefined);
      await setStoredUser(user.id, user.email);
      await api.onboard(user.id, {
        profession_slug: professionSlug,
        level_slug: levelSlug,
        weekly_hours: weeklyHours,
        preferred_language: 'ru',
      });
      router.replace('/course');
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setError(null);
    if (step === 0 && !professionSlug) {
      setError('Выберите профессию');
      return;
    }
    if (step === 1 && !levelSlug) {
      setError('Выберите уровень');
      return;
    }
    if (step < 2) setStep((s) => (s + 1) as Step);
    else onSubmit();
  }

  function back() {
    setError(null);
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => (s - 1) as Step);
  }

  if (loading) {
    return (
      <Atmosphere>
        <View style={styles.center}>
          <ActivityIndicator color={Palette.accent} />
        </View>
      </Atmosphere>
    );
  }

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.shell}>
          <View style={styles.topBar}>
            <Pressable onPress={back} hitSlop={12}>
              <ThemedText type="smallBold" style={styles.back}>
                ← назад
              </ThemedText>
            </Pressable>
            <View style={styles.steps}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={[styles.stepDot, i <= step && styles.stepDotOn]} />
              ))}
            </View>
            <ThemedText type="label" themeColor="textSecondary">
              {step + 1}/3
            </ThemedText>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {step === 0 ? (
              <View style={styles.panel}>
                <ThemedText type="title">Куда идём?</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Выберите профессию — AI соберёт курс именно под неё.
                </ThemedText>
                <View style={styles.grid}>
                  {professions.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => setProfessionSlug(p.slug)}
                      style={[
                        styles.profession,
                        professionSlug === p.slug && styles.professionOn,
                      ]}>
                      <ThemedText type="subtitle" style={styles.professionTitle}>
                        {p.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {p.description}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.panel}>
                <ThemedText type="title">Ваш уровень</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {selectedProfession
                    ? `Для ${selectedProfession.title} — честно, без завышения.`
                    : 'Честно оцените старт.'}
                </ThemedText>
                <View style={styles.stack}>
                  {levels.map((l) => (
                    <Choice
                      key={l.id}
                      selected={levelSlug === l.slug}
                      title={l.title}
                      subtitle={l.description}
                      onPress={() => setLevelSlug(l.slug)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.panel}>
                <ThemedText type="title">Почти готово</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Оставим контакт и ритм — чтобы курс был реалистичным.
                </ThemedText>

                <FieldInput
                  label="Имя"
                  value={name}
                  onChangeText={setName}
                  placeholder="Как к вам обращаться"
                />
                <FieldInput
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <View style={styles.hoursBlock}>
                  <ThemedText type="label">Часов в неделю</ThemedText>
                  <View style={styles.hoursRow}>
                    {HOUR_OPTIONS.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => setWeeklyHours(h)}
                        style={[styles.hourChip, weeklyHours === h && styles.hourChipOn]}>
                        <ThemedText
                          type="smallBold"
                          style={weeklyHours === h ? styles.hourTextOn : undefined}>
                          {h}ч
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              label={
                submitting ? 'Создаём…' : step === 2 ? 'Собрать мой курс' : 'Дальше'
              }
              onPress={next}
              disabled={submitting}
            />
          </View>
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  shell: {
    flex: 1,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  topBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  back: {
    color: Palette.inkSoft,
  },
  steps: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  stepDot: {
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: Palette.line,
  },
  stepDotOn: {
    backgroundColor: Palette.accent,
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.three,
  },
  panel: {
    gap: Spacing.three,
  },
  grid: {
    gap: Spacing.three,
    marginTop: Spacing.two,
  },
  profession: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1.5,
    borderColor: Palette.line,
    gap: Spacing.two,
    minHeight: 140,
    justifyContent: 'flex-end',
  },
  professionOn: {
    borderColor: Palette.accent,
    backgroundColor: '#FFF4EF',
  },
  professionTitle: {
    fontSize: 26,
    lineHeight: 30,
  },
  stack: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  hoursBlock: {
    gap: Spacing.two,
  },
  hoursRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  hourChip: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  hourChipOn: {
    borderColor: Palette.ink,
    backgroundColor: Palette.ink,
  },
  hourTextOn: {
    color: '#fff',
  },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
    paddingTop: Spacing.two,
  },
  error: { color: Palette.danger },
});
