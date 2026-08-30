import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, Divider } from '@/components/ui/card';
import { Choice } from '@/components/ui/choice';
import { FieldInput } from '@/components/ui/field-input';
import { Icon } from '@/components/ui/icon';
import { MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';
import { api, friendlyError, Profession, SkillLevel } from '@/lib/api';
import { setStoredUser } from '@/store/user';

type Step = 0 | 1 | 2;

const HOUR_OPTIONS = [5, 8, 12, 20];

const STEP_COPY: Record<Step, { title: string; hint: string }> = {
  0: { title: 'Кем вы хотите стать?', hint: 'Выберите направление — курс соберётся под него.' },
  1: { title: 'Ваш текущий уровень', hint: 'Оцените себя честно, программа подстроится.' },
  2: { title: 'Контакт и ритм', hint: 'Последний шаг — и можно начинать.' },
};

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
      .catch((e) => setError(friendlyError(e)))
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
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    setError(null);
    if (step === 0 && !professionSlug) {
      setError('Выберите направление');
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
      if (router.canGoBack()) router.back();
      else router.replace('/course');
      return;
    }
    setStep((s) => (s - 1) as Step);
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

  return (
    <Atmosphere>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <View style={styles.topInner}>
            <View style={styles.brand}>
              <View style={styles.logoMark}>
                <ThemedText type="metaBold" style={styles.logoText}>
                  SD
                </ThemedText>
              </View>
              <ThemedText type="smallBold">SelfDev</ThemedText>
            </View>
            <ThemedText type="meta" themeColor="textSecondary">
              Шаг {step + 1} из 3
            </ThemedText>
          </View>
          <View style={styles.stepTrack}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.stepSeg, i <= step && styles.stepSegOn]} />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Card>
            <View style={styles.headRow}>
              <Pressable
                onPress={back}
                accessibilityRole="button"
                accessibilityLabel="Назад"
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
                <Icon name="back" size={18} color={Palette.ink} />
              </Pressable>
              <View style={styles.headCopy}>
                <ThemedText type="title">{STEP_COPY[step].title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {STEP_COPY[step].hint}
                </ThemedText>
              </View>
            </View>

            <Divider style={styles.headDivider} />

            {step === 0 ? (
              <View style={styles.stack}>
                {professions.map((p) => (
                  <Pressable
                    key={p.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: professionSlug === p.slug }}
                    onPress={() => setProfessionSlug(p.slug)}
                    style={({ pressed }) => [
                      styles.profession,
                      professionSlug === p.slug && styles.professionOn,
                      pressed && styles.pressed,
                    ]}>
                    <Avatar
                      label={p.title}
                      size={48}
                      tone={professionSlug === p.slug ? 'brand' : 'neutral'}
                    />
                    <View style={styles.professionCopy}>
                      <ThemedText type="subtitle">{p.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {p.description}
                      </ThemedText>
                    </View>
                    {professionSlug === p.slug ? (
                      <Icon name="checkCircle" size={22} color={Palette.brand} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.stack}>
                {selectedProfession ? (
                  <ThemedText type="meta" themeColor="textSecondary">
                    Направление: {selectedProfession.title}
                  </ThemedText>
                ) : null}
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
            ) : null}

            {step === 2 ? (
              <View style={styles.stack}>
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
                  hint="Нужен, чтобы сохранить прогресс курса."
                />

                <View style={styles.hoursBlock}>
                  <ThemedText type="meta" themeColor="textSecondary">
                    Сколько часов в неделю готовы учиться
                  </ThemedText>
                  <View style={styles.hoursRow}>
                    {HOUR_OPTIONS.map((h) => (
                      <Pressable
                        key={h}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: weeklyHours === h }}
                        onPress={() => setWeeklyHours(h)}
                        style={({ pressed }) => [
                          styles.hourChip,
                          weeklyHours === h && styles.hourChipOn,
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText
                          type="smallBold"
                          style={weeklyHours === h ? styles.hourTextOn : styles.hourText}>
                          {h} ч
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </View>
            ) : null}

            <Button
              label={submitting ? 'Собираем курс…' : step === 2 ? 'Собрать мой курс' : 'Далее'}
              size="lg"
              fullWidth
              onPress={next}
              disabled={submitting}
              style={styles.submit}
            />
          </Card>
        </ScrollView>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  topInner: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: Radius.xs,
    backgroundColor: Palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff' },
  stepTrack: {
    flexDirection: 'row',
    gap: 2,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  stepSeg: {
    flex: 1,
    height: 3,
    backgroundColor: Palette.line,
  },
  stepSegOn: { backgroundColor: Palette.brand },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.seven,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headCopy: { flex: 1, gap: Spacing.one, paddingTop: Spacing.one },
  headDivider: { marginVertical: Spacing.four },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -Spacing.two,
  },
  iconBtnPressed: { backgroundColor: Palette.surfaceHover },
  stack: { gap: Spacing.two },
  pressed: { backgroundColor: Palette.surfaceAlt },
  profession: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  professionOn: {
    borderColor: Palette.brand,
    backgroundColor: Palette.brandSoft,
  },
  professionCopy: { flex: 1, gap: 2 },
  hoursBlock: { gap: Spacing.two, marginTop: Spacing.two },
  hoursRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  hourChip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  hourChipOn: {
    borderColor: Palette.brand,
    backgroundColor: Palette.brandSoft,
  },
  hourText: { color: Palette.inkSoft },
  hourTextOn: { color: Palette.brandDeep },
  errorBox: {
    marginTop: Spacing.four,
    padding: Spacing.three,
    borderRadius: Radius.xs,
    backgroundColor: Palette.dangerSoft,
  },
  errorText: { color: Palette.danger },
  submit: { marginTop: Spacing.five },
});
