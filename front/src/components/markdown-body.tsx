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
  if (!content.trim()) {
    return (
      <View style={bare ? undefined : styles.wrap}>
        <Markdown style={markdownStyles}>{emptyText}</Markdown>
      </View>
    );
  }

  return (
    <View style={bare ? undefined : styles.wrap}>
      <Markdown style={markdownStyles}>{content}</Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: Spacing.four,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.line,
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: Palette.ink,
    fontFamily: Fonts.serif as string,
    fontSize: 16,
    lineHeight: 26,
  },
  heading1: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 12,
    marginTop: 4,
  },
  heading2: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 20,
    lineHeight: 26,
    marginTop: 16,
    marginBottom: 8,
  },
  heading3: {
    color: Palette.ink,
    fontFamily: Fonts.sans as string,
    fontSize: 17,
    lineHeight: 22,
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  bullet_list: {
    marginBottom: 10,
  },
  ordered_list: {
    marginBottom: 10,
  },
  list_item: {
    marginBottom: 4,
  },
  code_inline: {
    backgroundColor: Palette.paperAlt,
    color: Palette.ink,
    fontFamily: Fonts.mono as string,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  fence: {
    backgroundColor: Palette.paperAlt,
    borderColor: Palette.line,
    borderRadius: Radius.sm,
    padding: Spacing.three,
    marginVertical: Spacing.two,
    fontFamily: Fonts.mono as string,
    fontSize: 13,
  },
  link: {
    color: Palette.accentDeep,
  },
  strong: {
    fontWeight: '700',
  },
});
