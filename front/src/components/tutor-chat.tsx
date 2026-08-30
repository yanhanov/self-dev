import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { ElevationRaised, Fonts, Palette, Radius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';
import { api, friendlyError, TutorCitation } from '@/lib/api';
import { getStoredUserId } from '@/store/user';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: TutorCitation[];
};

type Props = {
  lessonId: string;
  lessonTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const NATIVE_DRIVER = Platform.OS !== 'web';
const INPUT_MIN = 36;
const INPUT_MAX = 240;

function suggestionsForLesson(title?: string): string[] {
  const t = (title || '').toLowerCase();
  if (/flex|grid|css|стил|layout|верст/.test(t)) {
    return ['Чем flexbox отличается от grid?', 'Что такое box model?', 'Как сделать адаптив?'];
  }
  if (/react|хук|hook|компонент|jsx/.test(t)) {
    return ['Как работает useState?', 'Зачем useEffect?', 'Что такое props?'];
  }
  if (/html|семант|размет/.test(t)) {
    return ['Зачем semantic HTML?', 'Чем button лучше div?', 'Что писать в alt?'];
  }
  if (/git|ветк|commit/.test(t)) {
    return ['Что такое branch?', 'Как писать commit?', 'Зачем merge?'];
  }
  if (/typescript|тип|interface/.test(t)) {
    return ['type vs interface?', 'Что такое union?', 'Зачем generics?'];
  }
  if (/ux|исследован|эвристик|figma|дизайн|wireframe|доступн|wcag/.test(t)) {
    return ['Что такое usability test?', 'Зачем wireframes?', 'Что такое WCAG AA?'];
  }
  return ['В чём суть урока?', 'Дай простой пример', 'Какие частые ошибки?'];
}

/**
 * Panel only — the trigger lives in the lesson action bar, next to «Далее».
 * On a wide screen it docks over the reading column; on a phone it is a sheet.
 */
export function TutorChat({ lessonId, lessonTitle, open, onOpenChange }: Props) {
  const { isCompact } = useBreakpoint();
  const [input, setInput] = useState('');
  const [inputHeight, setInputHeight] = useState(INPUT_MIN);
  const [focused, setFocused] = useState(false);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Stay mounted through the closing animation.
  const [mounted, setMounted] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const suggestions = useMemo(() => suggestionsForLesson(lessonTitle), [lessonTitle]);

  useEffect(() => {
    let cancelled = false;
    if (open) setMounted(true);

    const run = Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? 200 : 140,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    });
    run.start(({ finished }) => {
      if (finished && !open && !cancelled) setMounted(false);
    });

    return () => {
      cancelled = true;
      run.stop();
    };
  }, [open, anim]);

  const loadHistory = useCallback(async () => {
    const uid = await getStoredUserId();
    if (!uid) return;
    setLoadingHistory(true);
    try {
      const history = await api.tutorHistory(uid, lessonId);
      setMessages(
        history
          .slice()
          .reverse()
          .map((h) => ({
            id: h.id,
            role: h.role === 'assistant' ? 'assistant' : 'user',
            content: h.content,
            citations: Array.isArray(h.citations) ? (h.citations as TutorCitation[]) : [],
          }))
      );
    } catch {
      // history is optional context
    } finally {
      setLoadingHistory(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (!open) return;
    loadHistory();
    const t = setTimeout(() => inputRef.current?.focus(), 240);
    return () => clearTimeout(t);
  }, [open, loadHistory]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, sending, open]);

  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  /** `appendUser` is false when retrying: the question is already in the thread. */
  const ask = useCallback(
    async (text: string, appendUser: boolean) => {
      const uid = await getStoredUserId();
      if (!uid) {
        setError('Сначала создайте курс');
        return;
      }

      setLastPrompt(text);
      setError(null);
      setSending(true);
      if (appendUser) {
        setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
      }

      try {
        const res = await api.tutorChat(uid, text, lessonId);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            content: res.answer,
            citations: res.citations,
          },
        ]);
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setSending(false);
        setTimeout(() => inputRef.current?.focus(), 40);
      }
    },
    [lessonId]
  );

  function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setInputHeight(INPUT_MIN);
    ask(text, true);
  }

  const canSend = !!input.trim() && !sending;
  const hasThread = messages.length > 0;

  const conversation = (
    <>
      <View style={styles.header}>
        <View style={styles.headerMark}>
          <Icon name="sparkle" size={16} color={Palette.brand} filled />
        </View>
        <View style={styles.headerText}>
          <ThemedText type="smallBold">Наставник</ThemedText>
          <ThemedText type="meta" themeColor="textSecondary" numberOfLines={1}>
            По материалам урока
          </ThemedText>
        </View>
        <Pressable
          onPress={() => onOpenChange(false)}
          accessibilityRole="button"
          accessibilityLabel="Закрыть чат"
          style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
          <Icon name="close" size={16} color={Palette.inkSoft} />
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.thread}
        contentContainerStyle={styles.threadContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {loadingHistory && !hasThread ? (
          <View style={styles.historyLoading}>
            <ActivityIndicator color={Palette.brand} />
          </View>
        ) : null}

        {!loadingHistory && !hasThread ? (
          <View style={styles.empty}>
            <View style={[styles.row, styles.rowAi]}>
              <AiBadge size={28} />
              <View style={[styles.bubble, styles.bubbleAi]}>
                <ThemedText type="smallBold">Спросите про этот урок</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Отвечаю по материалам курса и показываю источники.
                </ThemedText>
              </View>
            </View>
            <View style={styles.chips}>
              {suggestions.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => send(s)}
                  disabled={sending}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                  <ThemedText type="metaBold" style={styles.chipText}>
                    {s}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {messages.map((m) => {
          const mine = m.role === 'user';
          return (
            <View key={m.id} style={[styles.row, mine ? styles.rowUser : styles.rowAi]}>
              {!mine ? <AiBadge size={28} /> : null}

              <View style={[styles.bubble, mine ? styles.bubbleUser : styles.bubbleAi]}>
                {mine ? (
                  <ThemedText type="small" style={styles.userText}>
                    {m.content}
                  </ThemedText>
                ) : (
                  <Markdown style={md}>{m.content}</Markdown>
                )}

                {!mine && m.citations?.length ? (
                  <View style={styles.cites}>
                    <ThemedText type="meta" themeColor="textFaint">
                      Источники
                    </ThemedText>
                    <View style={styles.citeList}>
                      {m.citations.map((c, i) => (
                        <Pressable
                          key={`${c.chunk_id}-${i}`}
                          disabled={!c.url}
                          onPress={() => c.url && Linking.openURL(c.url)}
                          accessibilityRole="link"
                          accessibilityLabel={`Источник: ${c.source_title}`}
                          style={({ pressed }) => [styles.cite, pressed && styles.citePressed]}>
                          <View style={styles.citeIndex}>
                            <ThemedText type="meta" style={styles.citeIndexText}>
                              {i + 1}
                            </ThemedText>
                          </View>
                          <ThemedText type="meta" style={styles.citeText} numberOfLines={1}>
                            {c.source_title}
                          </ThemedText>
                          {c.url ? <Icon name="link" size={12} color={Palette.brand} /> : null}
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}

        {sending ? (
          <View style={[styles.row, styles.rowAi]}>
            <AiBadge size={28} />
            <View style={[styles.bubble, styles.bubbleAi, styles.typing]}>
              <TypingDots />
              <ThemedText type="meta" themeColor="textSecondary">
                Ищу в базе знаний
              </ThemedText>
            </View>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
            {lastPrompt && !sending ? (
              <Pressable
                onPress={() => ask(lastPrompt, false)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
                <Icon name="refresh" size={14} color={Palette.danger} />
                <ThemedText type="metaBold" style={styles.errorText}>
                  Повторить
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.composer}>
        <View style={[styles.bar, focused && styles.barFocused]}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={(text) => {
              setInput(text);
              if (!text) setInputHeight(INPUT_MIN);
            }}
            onContentSizeChange={(e) => {
              if (Platform.OS === 'web') return;
              const next = Math.ceil(e.nativeEvent.contentSize.height);
              setInputHeight(Math.min(INPUT_MAX, Math.max(INPUT_MIN, next)));
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Спросите про урок"
            placeholderTextColor={Palette.inkFaint}
            style={[
              styles.input,
              Platform.OS === 'web' ? styles.inputWeb : { height: inputHeight },
            ]}
            multiline
            scrollEnabled={inputHeight >= INPUT_MAX}
            editable={!sending}
            accessibilityLabel="Сообщение наставнику"
            // @ts-expect-error web-only key handling
            onKeyDown={(e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <Pressable
            onPress={() => send()}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Отправить"
            style={({ pressed }) => [
              styles.send,
              canSend ? styles.sendOn : styles.sendOff,
              pressed && canSend && styles.sendPressed,
            ]}>
            <Icon name="send" size={16} color="#fff" filled />
          </Pressable>
        </View>
      </View>
    </>
  );

  if (isCompact) {
    return (
      <Modal
        visible={mounted}
        animationType="none"
        transparent
        onRequestClose={() => onOpenChange(false)}>
        <KeyboardAvoidingView
          style={styles.sheetRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.scrim, { opacity: anim }]}>
            <Pressable
              style={styles.scrimHit}
              accessibilityRole="button"
              accessibilityLabel="Закрыть чат"
              onPress={() => onOpenChange(false)}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.panel,
              styles.panelSheet,
              {
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [420, 0],
                    }),
                  },
                ],
              },
            ]}>
            <View style={styles.handleZone}>
              <View style={styles.handle} />
            </View>
            {conversation}
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  if (!mounted) return null;

  return (
    <View style={styles.zoneDock} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.panel,
          styles.panelDock,
          {
            opacity: anim,
            transform: [
              {
                translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
              },
              {
                scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }),
              },
            ],
          },
        ]}>
        {conversation}
      </Animated.View>
    </View>
  );
}

/** Lives in the lesson action bar, immediately left of «Далее». */
export function TutorChatButton({ open, onPress }: { open: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={open ? 'Закрыть чат' : 'Открыть чат'}
      accessibilityState={{ expanded: open }}
      style={({ pressed }) => [
        styles.askBtn,
        open && styles.askBtnOn,
        pressed && (open ? styles.askBtnOnPressed : styles.askBtnPressed),
      ]}>
      <Icon name="chat" size={18} color={open ? '#fff' : Palette.brand} filled={open} />
      <ThemedText type="smallBold" style={open ? styles.askLabelOn : styles.askLabel}>
        Чат
      </ThemedText>
    </Pressable>
  );
}

/** The tutor's identity mark: a brand disc with a sparkle. */
function AiBadge({ size }: { size: number }) {
  return (
    <View style={[styles.aiBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name="sparkle" size={Math.round(size * 0.55)} color="#fff" filled />
    </View>
  );
}

function TypingDots() {
  const a = useRef(new Animated.Value(0.25)).current;
  const b = useRef(new Animated.Value(0.25)).current;
  const c = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const pulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, { toValue: 1, duration: 320, useNativeDriver: NATIVE_DRIVER }),
          Animated.timing(value, { toValue: 0.25, duration: 320, useNativeDriver: NATIVE_DRIVER }),
          Animated.delay(320 - delay),
        ])
      );

    const running = [pulse(a, 0), pulse(b, 160), pulse(c, 320)];
    running.forEach((r) => r.start());
    return () => running.forEach((r) => r.stop());
  }, [a, b, c]);

  return (
    <View style={styles.dots}>
      <Animated.View style={[styles.dot, { opacity: a }]} />
      <Animated.View style={[styles.dot, { opacity: b }]} />
      <Animated.View style={[styles.dot, { opacity: c }]} />
    </View>
  );
}

const md = StyleSheet.create({
  body: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 14,
    lineHeight: 20,
  },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: '600' },
  bullet_list: { marginBottom: 6 },
  ordered_list: { marginBottom: 6 },
  list_item: { marginBottom: 2 },
  code_inline: {
    fontFamily: Fonts.mono as string,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 13,
  },
  fence: {
    fontFamily: Fonts.mono as string,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    padding: 10,
    borderRadius: Radius.xs,
    fontSize: 12,
    marginVertical: 6,
  },
  link: { color: Palette.brand },
});

const styles = StyleSheet.create({
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 36,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.brand,
    backgroundColor: 'transparent',
  },
  askBtnOn: {
    backgroundColor: Palette.brand,
    borderColor: Palette.brand,
  },
  askBtnPressed: {
    backgroundColor: Palette.brandWash,
  },
  askBtnOnPressed: {
    backgroundColor: Palette.brandDeep,
  },
  askLabel: { color: Palette.brand },
  askLabelOn: { color: '#fff' },

  zoneDock: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    top: Spacing.four,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },

  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  scrimHit: { flex: 1 },

  panel: {
    backgroundColor: Palette.surface,
    overflow: 'hidden',
    ...ElevationRaised,
  },
  panelSheet: {
    width: '100%',
    maxHeight: '92%',
    minHeight: '62%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  panelDock: {
    width: 400,
    maxWidth: '100%',
    height: '100%',
    borderRadius: Radius.lg,
  },
  handleZone: {
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.lineStrong,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
  },
  headerMark: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandSoft,
  },
  headerText: { flex: 1, gap: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceAlt,
  },
  pressed: { backgroundColor: Palette.surfaceHover },

  aiBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brand,
  },

  thread: { flex: 1, backgroundColor: Palette.paper },
  threadContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
  historyLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    gap: Spacing.three,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingLeft: 36,
  },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.lineStrong,
    backgroundColor: Palette.surface,
  },
  chipPressed: {
    backgroundColor: Palette.brandSoft,
    borderColor: Palette.brand,
  },
  chipText: { color: Palette.ink },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  rowUser: { justifyContent: 'flex-end' },
  rowAi: { justifyContent: 'flex-start' },
  bubble: {
    flexShrink: 1,
    maxWidth: '86%',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    gap: Spacing.two,
  },
  bubbleUser: {
    backgroundColor: Palette.brand,
    borderBottomRightRadius: Radius.xs,
  },
  bubbleAi: {
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
    borderBottomLeftRadius: Radius.xs,
  },
  userText: { color: '#fff' },

  cites: {
    gap: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: Palette.lineStrong,
    paddingTop: Spacing.two,
  },
  citeList: { gap: Spacing.one },
  cite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  citePressed: { opacity: 0.6 },
  citeIndex: {
    width: 16,
    height: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.brandSoft,
  },
  citeIndexText: { color: Palette.brandDeep, fontSize: 10, lineHeight: 14 },
  citeText: { flex: 1, color: Palette.brand },

  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.brand,
  },

  errorBox: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: Palette.danger,
    backgroundColor: Palette.dangerSoft,
  },
  errorText: { color: Palette.danger },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },

  composer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    backgroundColor: Palette.surface,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingLeft: Spacing.four,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 22,
    backgroundColor: Palette.surface,
    ...Platform.select({
      web: { boxShadow: '0 0 0 1px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.06)' } as object,
      default: {
        borderWidth: 1,
        borderColor: Palette.lineStrong,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      } as object,
    }),
  },
  barFocused: {
    ...Platform.select({
      web: { boxShadow: '0 0 0 1.5px rgba(10, 102, 194, 0.45), 0 2px 8px rgba(10, 102, 194, 0.12)' } as object,
      default: { borderColor: Palette.brand } as object,
    }),
  },
  input: {
    flex: 1,
    paddingTop: 8,
    paddingBottom: 8,
    color: Palette.ink,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: Fonts.sans as string,
  },
  inputWeb: {
    minHeight: INPUT_MIN,
    maxHeight: INPUT_MAX,
    height: 'auto',
    outlineStyle: 'none',
    resize: 'none',
    overflow: 'auto',
    fieldSizing: 'content',
  } as object,
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOn: { backgroundColor: Palette.brand },
  sendOff: { backgroundColor: 'rgba(0, 0, 0, 0.22)' },
  sendPressed: { backgroundColor: Palette.brandDeep },
});
