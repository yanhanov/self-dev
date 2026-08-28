import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Palette, Spacing } from '@/constants/theme';
import type { SourceRef } from '@/lib/api';

type Props = {
  refs?: SourceRef[] | unknown;
};

function normalizeRefs(refs: SourceRef[] | unknown): SourceRef[] {
  if (!Array.isArray(refs)) return [];
  return refs.filter(
    (r): r is SourceRef =>
      !!r && typeof r === 'object' && typeof (r as SourceRef).source_title === 'string'
  );
}

export function SourceRefs({ refs }: Props) {
  const items = normalizeRefs(refs);
  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      {items.map((ref, idx) => (
        <Pressable
          key={`${ref.chunk_id || ref.url}-${idx}`}
          onPress={() => {
            if (ref.url) Linking.openURL(ref.url);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <ThemedText type="code" style={styles.index}>
            {idx + 1}
          </ThemedText>
          <ThemedText type="small" style={styles.title} numberOfLines={2}>
            {ref.source_title}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: 8,
  },
  rowPressed: {
    opacity: 0.7,
  },
  index: {
    color: Palette.mint,
    minWidth: 16,
  },
  title: {
    flex: 1,
    textDecorationLine: 'underline',
    textDecorationColor: Palette.line,
  },
});
