import { StyleSheet, View, type ViewProps } from 'react-native';

import { Palette } from '@/constants/theme';

type AtmosphereProps = ViewProps & {
  children: React.ReactNode;
};

export function Atmosphere({ children, style, ...rest }: AtmosphereProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <View style={styles.wash} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  wash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Palette.paperAlt,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
