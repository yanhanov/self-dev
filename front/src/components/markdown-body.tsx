import { Platform, StyleSheet, Text, View } from 'react-native';
import Markdown from 'react-native-markdown-display';

import { Fonts, Palette, Radius, Spacing } from '@/constants/theme';

type Props = {
  content: string;
  emptyText?: string;
  bare?: boolean;
};

/**
 * Library defaults merge in padding:10 on code_inline and flexDirection:row
 * on paragraphs — on web that lifts code chips off the line. Override fully.
 */
const markdownRules = {
  code_inline: (
    node: { key: string; content: string },
    _children: unknown,
    _parent: unknown,
    styles: Record<string, object>,
    inheritedStyles: object = {}
  ) => (
    <Text key={node.key} style={[inheritedStyles, styles.code_inline]}>
      {node.content}
    </Text>
  ),
};

export function MarkdownBody({
  content,
  emptyText = 'Контент ещё генерируется…',
  bare = false,
}: Props) {
  const body = content.trim() ? content : emptyText;

  return (
    <View style={[bare ? styles.bare : styles.wrap, styles.base]}>
      <Markdown style={markdownStyles} rules={markdownRules} mergeStyle>
        {body}
      </Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    flexDirection: 'column',
  },
  bare: {},
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
  // Kill default flexDirection:row / alignItems:flex-start that parks
  // padded code chips on their own row above the sentence.
  paragraph: {
    marginTop: 0,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    width: '100%',
  },
  bullet_list: {
    marginBottom: 12,
  },
  ordered_list: {
    marginBottom: 12,
  },
  list_item: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet_list_icon: {
    marginLeft: 0,
    marginRight: 8,
    lineHeight: 24,
  },
  ordered_list_icon: {
    marginLeft: 0,
    marginRight: 8,
    lineHeight: 24,
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
    color: Palette.ink,
    fontFamily: Fonts.mono as string,
    fontSize: 13,
    lineHeight: 18,
    backgroundColor: Palette.surfaceAlt,
    borderWidth: 1,
    borderColor: Palette.line,
    borderRadius: 4,
    // Default lib style is padding: 10 — must zero it out or chips explode.
    padding: 0,
    paddingHorizontal: 5,
    paddingVertical: 2,
    ...Platform.select({
      web: {
        // Keep the chip in the text flow on RN Web.
        display: 'inline' as unknown as undefined,
        verticalAlign: 'middle' as unknown as undefined,
      },
      default: {},
    }),
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
