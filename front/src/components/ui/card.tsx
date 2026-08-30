import { StyleSheet, View, type ViewProps } from 'react-native';

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
  divider: {
    height: 1,
    backgroundColor: Palette.line,
  },
});
