import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Palette, Radius, Spacing } from '@/constants/theme';
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
          accessibilityRole="link"
          onPress={() => {
            if (ref.url) Linking.openURL(ref.url);
          }}
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
          <View style={styles.index}>
            <ThemedText type="metaBold" style={styles.indexText}>
              {idx + 1}
            </ThemedText>
          </View>
          <ThemedText type="small" style={styles.title} numberOfLines={2}>
            {ref.source_title}
          </ThemedText>
          {ref.url ? <Icon name="link" size={14} color={Palette.inkFaint} /> : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.xs,
  },
  rowPressed: {
    backgroundColor: Palette.surfaceHover,
  },
  index: {
    width: 20,
    height: 20,
    borderRadius: Radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceAlt,
  },
  indexText: {
    color: Palette.inkSoft,
  },
  title: {
    flex: 1,
    color: Palette.brand,
  },
});
