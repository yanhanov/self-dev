import { StyleSheet, View, type ViewProps } from 'react-native';

import { Palette } from '@/constants/theme';

type AtmosphereProps = ViewProps & {
  children: React.ReactNode;
};

/** Flat neutral canvas that lets the white content cards carry the hierarchy. */
export function Atmosphere({ children, style, ...rest }: AtmosphereProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
});
