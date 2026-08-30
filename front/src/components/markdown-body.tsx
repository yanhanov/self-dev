import { StyleSheet, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

type Props = {
  content: string;
  emptyText?: string;
  bare?: boolean;
};

export function MarkdownBody({
  content,
  emptyText = 'Контент ещё генерируется…',
  bare = false,
}: Props) {
  const body = content.trim() ? content : emptyText;

  return (
    <View style={bare ? undefined : styles.wrap}>
      <Markdown style={markdownStyles}>{body}</Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: Spacing.four,
    borderRadius: Radius.sm,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 15,
    lineHeight: 24,
  },
  heading1: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  heading2: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 6,
  },
  heading3: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 12,
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  list_item: {
    marginBottom: 4,
  },
  blockquote: {
    backgroundColor: Palette.surfaceAlt,
    borderLeftWidth: 3,
    borderLeftColor: Palette.brand,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    marginBottom: 12,
  },
  code_inline: {
    backgroundColor: Palette.surfaceAlt,
    color: Palette.ink,
    fontFamily: Fonts.mono as string,
    borderRadius: 4,
    paddingHorizontal: 4,
    fontSize: 13,
  },
  fence: {
    backgroundColor: Palette.surfaceAlt,
    borderColor: Palette.line,
    borderWidth: 1,
    borderRadius: Radius.xs,
    padding: Spacing.three,
    marginVertical: Spacing.two,
    fontFamily: Fonts.mono as string,
    fontSize: 13,
  },
  link: {
    color: Palette.brand,
    fontWeight: '600',
  },
  strong: {
    fontWeight: '600',
  },
  hr: {
    backgroundColor: Palette.line,
    height: 1,
    marginVertical: Spacing.three,
  },
});
