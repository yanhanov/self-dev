import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

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

export function TutorChat({ lessonId, lessonTitle, open: openProp, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? !!openProp : internalOpen;
  const { width } = useWindowDimensions();
  const sheetMax = Math.min(560, width - 32);

  function setOpen(next: boolean) {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const suggestions = useMemo(() => suggestionsForLesson(lessonTitle), [lessonTitle]);

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
      // optional
    } finally {
      setLoadingHistory(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (!open) return;
    loadHistory();
    const t = setTimeout(() => inputRef.current?.focus(), 280);
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
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;
    const uid = await getStoredUserId();
    if (!uid) {
      setError('Сначала создайте курс');
      return;
    }

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }]);
    setInput('');
    setSending(true);
    setError(null);

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
  }

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} />

        <View style={[styles.sheet, { maxWidth: sheetMax }]}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="subtitle" style={styles.headerTitle}>
                Спросить
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {lessonTitle || 'По проверенным материалам'}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              hitSlop={12}
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Закрыть
              </ThemedText>
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {loadingHistory && messages.length === 0 ? (
              <ActivityIndicator color={Palette.accent} style={{ marginVertical: 32 }} />
            ) : null}

            {!loadingHistory && messages.length === 0 ? (
              <View style={styles.empty}>
                <ThemedText type="small" themeColor="textSecondary">
                  Короткий вопрос по уроку — отвечу только из базы знаний.
                </ThemedText>
                <View style={styles.chips}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => send(s)}
                      disabled={sending}
                      style={({ pressed }) => [styles.chip, pressed && styles.chipOn]}>
                      <ThemedText type="small">{s}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.msg, m.role === 'user' ? styles.msgUser : styles.msgAi]}>
                {m.role === 'assistant' ? (
                  <Markdown style={md}>{m.content}</Markdown>
                ) : (
                  <ThemedText type="small" style={styles.userText}>
                    {m.content}
                  </ThemedText>
                )}

                {m.citations?.length ? (
                  <View style={styles.cites}>
                    {m.citations.map((c, i) => (
                      <Pressable
                        key={`${c.chunk_id}-${i}`}
                        onPress={() => c.url && Linking.openURL(c.url)}
                        style={styles.cite}>
                        <ThemedText type="code" style={styles.citeN}>
                          {i + 1}
                        </ThemedText>
                        <ThemedText type="small" style={styles.citeT} numberOfLines={1}>
                          {c.source_title}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            ))}

            {sending ? (
              <View style={[styles.msg, styles.msgAi, styles.typing]}>
                <ActivityIndicator color={Palette.mint} size="small" />
                <ThemedText type="small" themeColor="textSecondary">
                  Ищу в базе…
                </ThemedText>
              </View>
            ) : null}

            {error ? (
              <ThemedText type="small" style={styles.error}>
                {error}
              </ThemedText>
            ) : null}
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Ваш вопрос…"
              placeholderTextColor={Palette.inkSoft}
              style={styles.input}
              multiline
              editable={!sending}
              // @ts-expect-error web
              onKeyDown={(e: { key: string; shiftKey: boolean; preventDefault: () => void }) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <Pressable
              onPress={() => send()}
              disabled={sending || !input.trim()}
              style={({ pressed }) => [
                styles.send,
                (!input.trim() || sending) && styles.sendOff,
                pressed && { opacity: 0.9 },
              ]}>
              <ThemedText type="smallBold" style={styles.sendText}>
                →
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const md = StyleSheet.create({
  body: {
    color: Palette.ink,
    fontFamily: Fonts.serif as string,
    fontSize: 15,
    lineHeight: 23,
  },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontFamily: Fonts.sans as string, fontWeight: '700' },
  bullet_list: { marginBottom: 6 },
  list_item: { marginBottom: 2 },
  code_inline: {
    fontFamily: Fonts.mono as string,
    backgroundColor: Palette.paperAlt,
    borderRadius: 4,
    paddingHorizontal: 3,
    fontSize: 13,
  },
  fence: {
    fontFamily: Fonts.mono as string,
    backgroundColor: Palette.paperAlt,
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    marginVertical: 6,
  },
  link: { color: Palette.accentDeep },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(20, 32, 28, 0.45)',
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    minHeight: '52%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderBottomWidth: 0,
    borderColor: Palette.line,
    paddingBottom: Spacing.three,
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 -12px 40px rgba(20,32,28,0.18)' } as object)
      : {
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -6 },
          elevation: 16,
        }),
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(20,32,28,0.16)',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  headerText: { flex: 1, gap: 4 },
  headerTitle: { letterSpacing: -0.4 },
  close: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  thread: { flexGrow: 1 },
  threadContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
    flexGrow: 1,
  },
  empty: { gap: Spacing.three, paddingTop: Spacing.one },
  chips: { gap: 8 },
  chip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.paper,
    borderWidth: 1,
    borderColor: Palette.line,
  },
  chipOn: {
    borderColor: Palette.accent,
    backgroundColor: '#FFF4EF',
  },
  msg: {
    maxWidth: '92%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 18,
    gap: 8,
  },
  msgUser: {
    alignSelf: 'flex-end',
    backgroundColor: Palette.ink,
    borderBottomRightRadius: 6,
  },
  msgAi: {
    alignSelf: 'flex-start',
    backgroundColor: Palette.paper,
    borderBottomLeftRadius: 6,
  },
  userText: { color: '#fff' },
  cites: { gap: 6, marginTop: 2 },
  cite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  citeN: {
    color: Palette.mint,
    minWidth: 12,
  },
  citeT: {
    flex: 1,
    color: Palette.inkSoft,
    textDecorationLine: 'underline',
    textDecorationColor: Palette.line,
  },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  error: { color: Palette.danger, paddingHorizontal: 4 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginHorizontal: Spacing.four,
    marginTop: Spacing.two,
    padding: 6,
    paddingLeft: 14,
    borderRadius: Radius.md,
    backgroundColor: Palette.paper,
    borderWidth: 1.5,
    borderColor: Palette.line,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 110,
    paddingVertical: 10,
    color: Palette.ink,
    fontSize: 16,
    fontFamily: Fonts.serif as string,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendOff: { opacity: 0.35 },
  sendText: { color: '#fff', fontSize: 18 },
});
