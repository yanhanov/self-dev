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
import { Avatar } from '@/components/ui/avatar';
import { Icon } from '@/components/ui/icon';
import {
  ElevationRaised,
  Fonts,
  Palette,
  Radius,
  Spacing,
} from '@/constants/theme';
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
  const sheetMax = Math.min(560, width);

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
      // history is optional context
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

  const canSend = !!input.trim() && !sending;

  return (
    <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          style={styles.scrim}
          accessibilityLabel="Закрыть чат"
          onPress={() => setOpen(false)}
        />

        <View style={[styles.sheet, { maxWidth: sheetMax }]}>
          <View style={styles.header}>
            <Avatar label="AI" size={36} shape="circle" />
            <View style={styles.headerText}>
              <ThemedText type="smallBold">Наставник</ThemedText>
              <ThemedText type="meta" themeColor="textSecondary" numberOfLines={1}>
                {lessonTitle || 'Отвечает по материалам урока'}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              hitSlop={8}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}>
              <Icon name="close" size={18} color={Palette.inkSoft} />
            </Pressable>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.thread}
            contentContainerStyle={styles.threadContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {loadingHistory && messages.length === 0 ? (
              <ActivityIndicator color={Palette.brand} style={styles.historySpinner} />
            ) : null}

            {!loadingHistory && messages.length === 0 ? (
              <View style={styles.empty}>
                <ThemedText type="small" themeColor="textSecondary">
                  Задайте короткий вопрос по уроку — отвечу только по проверенным материалам.
                </ThemedText>
                <View style={styles.chips}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => send(s)}
                      disabled={sending}
                      accessibilityRole="button"
                      style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}>
                      <ThemedText type="smallBold" style={styles.chipText}>
                        {s}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {messages.map((m) => (
              <View
                key={m.id}
                style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowAi]}>
                <View style={[styles.msg, m.role === 'user' ? styles.msgUser : styles.msgAi]}>
                  {m.role === 'assistant' ? (
                    <Markdown style={md}>{m.content}</Markdown>
                  ) : (
                    <ThemedText type="small">{m.content}</ThemedText>
                  )}

                  {m.citations?.length ? (
                    <View style={styles.cites}>
                      {m.citations.map((c, i) => (
                        <Pressable
                          key={`${c.chunk_id}-${i}`}
                          onPress={() => c.url && Linking.openURL(c.url)}
                          accessibilityRole="link"
                          style={({ pressed }) => [styles.cite, pressed && styles.citePressed]}>
                          <Icon name="link" size={13} color={Palette.brand} />
                          <ThemedText type="meta" style={styles.citeText} numberOfLines={1}>
                            {c.source_title}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            ))}

            {sending ? (
              <View style={[styles.msgRow, styles.msgRowAi]}>
                <View style={[styles.msg, styles.msgAi, styles.typing]}>
                  <ActivityIndicator color={Palette.brand} size="small" />
                  <ThemedText type="small" themeColor="textSecondary">
                    Ищу в базе знаний…
                  </ThemedText>
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
          </ScrollView>

          <View style={styles.composer}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Напишите сообщение…"
              placeholderTextColor={Palette.inkFaint}
              style={styles.input}
              multiline
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
                !canSend && styles.sendOff,
                pressed && styles.sendPressed,
              ]}>
              <Icon name="send" size={16} color="#fff" />
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
    fontFamily: Fonts.sans as string,
    fontSize: 14,
    lineHeight: 20,
  },
  paragraph: { marginTop: 0, marginBottom: 8 },
  strong: { fontWeight: '600' },
  bullet_list: { marginBottom: 6 },
  list_item: { marginBottom: 2 },
  code_inline: {
    fontFamily: Fonts.mono as string,
    backgroundColor: Palette.surfaceAlt,
    borderRadius: 4,
    paddingHorizontal: 3,
    fontSize: 13,
  },
  fence: {
    fontFamily: Fonts.mono as string,
    backgroundColor: Palette.surfaceAlt,
    padding: 10,
    borderRadius: Radius.xs,
    fontSize: 12,
    marginVertical: 6,
  },
  link: { color: Palette.brand },
});

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  /** Docked message panel, like LinkedIn's messaging overlay. */
  sheet: {
    width: '100%',
    maxHeight: '86%',
    minHeight: '55%',
    backgroundColor: Palette.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    overflow: 'hidden',
    ...ElevationRaised,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  headerText: { flex: 1, gap: 1 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: { backgroundColor: Palette.surfaceHover },
  thread: { flexGrow: 1, backgroundColor: Palette.surface },
  threadContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  historySpinner: { marginVertical: Spacing.six },
  empty: { gap: Spacing.four, paddingTop: Spacing.two },
  chips: { gap: Spacing.two, alignItems: 'flex-start' },
  chip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Palette.brand,
  },
  chipPressed: { backgroundColor: Palette.brandWash },
  chipText: { color: Palette.brand },
  msgRow: { flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowAi: { justifyContent: 'flex-start' },
  msg: {
    maxWidth: '88%',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.lg,
    gap: Spacing.two,
  },
  msgUser: {
    backgroundColor: Palette.brandSoft,
    borderBottomRightRadius: Radius.xs,
  },
  msgAi: {
    backgroundColor: Palette.surfaceAlt,
    borderBottomLeftRadius: Radius.xs,
  },
  cites: {
    gap: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    paddingTop: Spacing.two,
  },
  cite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  citePressed: { opacity: 0.6 },
  citeText: { flex: 1, color: Palette.brand },
  typing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  errorBox: {
    padding: Spacing.three,
    borderRadius: Radius.xs,
    backgroundColor: Palette.dangerSoft,
  },
  errorText: { color: Palette.danger },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: Palette.line,
    backgroundColor: Palette.surface,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceAlt,
    color: Palette.ink,
    fontSize: 15,
    fontFamily: Fonts.sans as string,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPressed: { backgroundColor: Palette.brandDeep },
  sendOff: { opacity: 0.35 },
});
