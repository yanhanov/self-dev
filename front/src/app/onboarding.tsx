import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { type Href, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Atmosphere } from '@/components/ui/atmosphere';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Choice } from '@/components/ui/choice';
import { FieldInput } from '@/components/ui/field-input';
import { Icon } from '@/components/ui/icon';
import { Layout, Palette, Radius, Spacing } from '@/constants/theme';
import { api, friendlyError, Profession, SkillLevel } from '@/lib/api';
import { setStoredUser } from '@/store/user';

/**
 * MVP onboarding follows CareerOS plan:
 *   Goal → Contact & rhythm → Skill Assessment (for Data Analyst)
 * Self-reported "level" is skipped for DA — assessment replaces it.
 */

const HOUR_OPTIONS = [5, 8, 12, 20];

const DA_STEPS = [
  {
    title: 'Кем вы хотите стать?',
    hint: 'Первый vertical — Data Analyst. От цели к job-ready маршруту.',
    incomplete: 'Выберите направление, чтобы продолжить',
  },
  {
    title: 'Контакт и ритм',
    hint: 'Сохраним прогресс. Дальше — проверка навыков (~20 мин), не самооценка.',
    incomplete: 'Укажите email, чтобы начать assessment',
  },
] as const;

const OTHER_STEPS = [
  {
    title: 'Кем вы хотите стать?',
    hint: 'Выберите направление — программа соберётся под него.',
    incomplete: 'Выберите направление, чтобы продолжить',
  },
  {
    title: 'Какой у вас уровень?',
    hint: 'Оцените себя честно — курс подстроится под старт.',
    incomplete: 'Выберите уровень, чтобы продолжить',
  },
  {
    title: 'Контакт и ритм',
    hint: 'Последний шаг — сохраним прогресс и рассчитаем нагрузку.',
    incomplete: 'Укажите email, чтобы собрать курс',
  },
] as const;

function isEmailValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [levels, setLevels] = useState<SkillLevel[]>([]);
  const [professionSlug, setProfessionSlug] = useState<string | null>('data_analyst');
  const [levelSlug, setLevelSlug] = useState<string | null>(null);
  const [weeklyHours, setWeeklyHours] = useState(8);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDa = professionSlug === 'data_analyst';
  const steps = isDa ? DA_STEPS : OTHER_STEPS;
  const maxStep = steps.length - 1;

  useEffect(() => {
    Promise.all([api.getProfessions(), api.getSkillLevels()])
      .then(([p, l]) => {
        setProfessions(p);
        setLevels(l);
        if (!p.some((x) => x.slug === 'data_analyst') && p[0]) {
          setProfessionSlug(p[0].slug);
        }
      })
      .catch((e) => setError(friendlyError(e)))
      .finally(() => setLoading(false));
  }, []);

  // Reset step when switching DA ↔ other (different step counts)
  useEffect(() => {
    setStep(0);
    if (isDa) setLevelSlug(null);
  }, [isDa]);

  const selectedProfession = useMemo(
    () => professions.find((p) => p.slug === professionSlug),
    [professions, professionSlug]
  );

  const stepComplete = isDa
    ? step === 0
      ? !!professionSlug
      : isEmailValid(email)
    : step === 0
      ? !!professionSlug
      : step === 1
        ? !!levelSlug
        : isEmailValid(email);

  async function onSubmit() {
    if (!professionSlug || !isEmailValid(email)) return;
    if (!isDa && !levelSlug) return;

    setSubmitting(true);
    setError(null);
    try {
      const user = await api.createUser(email.trim(), name.trim() || undefined);
      await setStoredUser(user.id, user.email);
      const onboard = await api.onboard(user.id, {
        profession_slug: professionSlug,
        level_slug: isDa ? undefined : levelSlug || undefined,
        weekly_hours: weeklyHours,
        preferred_language: 'ru',
      });
      if (onboard.next === 'assessment' || professionSlug === 'data_analyst') {
        router.replace('/assessment' as Href);
      } else {
        router.replace('/course');
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (!stepComplete) return;
    setError(null);
    if (step < maxStep) setStep((s) => s + 1);
    else onSubmit();
  }

  function back() {
    setError(null);
    if (step > 0) {
      setStep((s) => s - 1);
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/course');
  }

  const ctaLabel = submitting
    ? isDa
      ? 'Открываем assessment…'
      : 'Собираем курс…'
    : step === maxStep
      ? isDa
        ? 'Пройти проверку навыков'
        : 'Собрать мой курс'
      : 'Далее';

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
        <View style={styles.header}>
          <View style={styles.headerInner}>
            <View style={styles.brand}>
              <View style={styles.logoMark}>
                <ThemedText type="metaBold" style={styles.logoText}>
                  SD
                </ThemedText>
              </View>
              <ThemedText type="smallBold">SelfDev</ThemedText>
            </View>
            <ThemedText type="meta" themeColor="textSecondary">
              Шаг {step + 1} из {steps.length}
            </ThemedText>
          </View>
          <View style={styles.stepTrack}>
            {steps.map((s, i) => (
              <View key={s.title} style={[styles.stepSeg, i <= step && styles.stepSegOn]} />
            ))}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.intro}>
              <ThemedText type="title">{steps[step].title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {steps[step].hint}
              </ThemedText>
            </View>

            {step === 0 ? (
              <View style={styles.stack}>
                {professions.map((p) => {
                  const selected = professionSlug === p.slug;
                  const isPrimary = p.slug === 'data_analyst';
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setProfessionSlug(p.slug)}
                      style={({ pressed }) => [
                        styles.option,
                        selected && styles.optionOn,
                        pressed && !selected && styles.pressed,
                      ]}>
                      <Avatar label={p.title} size={44} tone={selected ? 'brand' : 'neutral'} />
                      <View style={styles.optionCopy}>
                        <View style={styles.titleRow}>
                          <ThemedText type="subtitle">{p.title}</ThemedText>
                          {isPrimary ? (
                            <ThemedText type="meta" style={styles.badge}>
                              MVP
                            </ThemedText>
                          ) : null}
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          {p.description}
                        </ThemedText>
                      </View>
                      {selected ? (
                        <Icon name="checkCircle" size={22} color={Palette.brand} filled />
                      ) : null}
                    </Pressable>
                  );
                })}
                {isDa ? (
                  <Card>
                    <ThemedText type="smallBold">Что дальше</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Skill Assessment → Skill Graph → персональный roadmap → ежедневные missions.
                      Уровень мы не спрашиваем — измерим задачами.
                    </ThemedText>
                  </Card>
                ) : null}
              </View>
            ) : null}

            {!isDa && step === 1 ? (
              <View style={styles.stack}>
                {selectedProfession ? (
                  <View style={styles.contextRow}>
                    <Avatar label={selectedProfession.title} size={32} />
                    <ThemedText type="meta" themeColor="textSecondary">
                      Направление: {selectedProfession.title}
                    </ThemedText>
                  </View>
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

            {(isDa && step === 1) || (!isDa && step === 2) ? (
              <Card>
                <View style={styles.form}>
                  <FieldInput
                    label="Имя"
                    value={name}
                    onChangeText={setName}
                    placeholder="Как к вам обращаться"
                    returnKeyType="next"
                  />
                  <FieldInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="done"
                    onSubmitEditing={next}
                    hint="Нужен, чтобы сохранить прогресс и skill graph."
                    error={
                      email.length > 0 && !isEmailValid(email) ? 'Проверьте формат email' : undefined
                    }
                  />

                  <View style={styles.hoursBlock}>
                    <ThemedText type="meta" themeColor="textSecondary">
                      Сколько часов в неделю готовы учиться
                    </ThemedText>
                    <View style={styles.hoursRow}>
                      {HOUR_OPTIONS.map((h) => {
                        const selected = weeklyHours === h;
                        return (
                          <Pressable
                            key={h}
                            accessibilityRole="radio"
                            accessibilityState={{ selected }}
                            onPress={() => setWeeklyHours(h)}
                            style={({ pressed }) => [
                              styles.hourChip,
                              selected && styles.hourChipOn,
                              pressed && !selected && styles.pressed,
                            ]}>
                            <ThemedText
                              type="smallBold"
                              style={selected ? styles.hourTextOn : styles.hourText}>
                              {h} ч
                            </ThemedText>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </Card>
            ) : null}

            {error ? (
              <View style={styles.errorBox}>
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.footerInner}>
            <Button label="Назад" variant="tertiary" size="lg" onPress={back} />
            <View style={styles.footerRight}>
              {!stepComplete ? (
                <ThemedText type="meta" themeColor="textSecondary" style={styles.footerHint}>
                  {steps[step].incomplete}
                </ThemedText>
              ) : null}
              <Button
                label={ctaLabel}
                size="lg"
                onPress={next}
                disabled={submitting || !stepComplete}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  headerInner: {
    maxWidth: Layout.mainWidth,
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
    maxWidth: Layout.mainWidth,
    width: '100%',
    alignSelf: 'center',
  },
  stepSeg: {
    flex: 1,
    height: 3,
    backgroundColor: Palette.line,
  },
  stepSegOn: { backgroundColor: Palette.brand },
  scroll: { flexGrow: 1 },
  content: {
    maxWidth: Layout.mainWidth,
    width: '100%',
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  intro: { gap: Spacing.one },
  stack: { gap: Spacing.two },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingBottom: Spacing.one,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  badge: {
    color: Palette.brandDeep,
    backgroundColor: Palette.brandSoft,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
  pressed: { backgroundColor: Palette.surfaceAlt },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  optionOn: {
    borderColor: Palette.brand,
    backgroundColor: Palette.brandSoft,
  },
  optionCopy: { flex: 1, gap: 2 },
  form: { gap: Spacing.four },
  hoursBlock: { gap: Spacing.two },
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
    padding: Spacing.three,
    borderRadius: Radius.xs,
    backgroundColor: Palette.dangerSoft,
  },
  errorText: { color: Palette.danger },
  footer: {
    backgroundColor: Palette.surface,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
  },
  footerInner: {
    maxWidth: Layout.mainWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexShrink: 1,
  },
  footerHint: { flexShrink: 1, textAlign: 'right' },
});
