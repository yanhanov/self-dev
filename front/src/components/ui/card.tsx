import { StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Elevation, Palette, Radius, Spacing } from '@/constants/theme';

type CardProps = ViewProps & {
  padded?: boolean;
};

export function Card({ children, style, padded = true, ...rest }: CardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );
}

export function CardHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {action}
    </View>
  );
}

export function Divider({ style }: { style?: ViewProps['style'] }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    ...Elevation,
  },
  padded: {
    padding: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.line,
  },
});
