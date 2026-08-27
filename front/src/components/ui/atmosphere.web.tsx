import type { CSSProperties } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

type AtmosphereProps = ViewProps & {
  children: React.ReactNode;
};

export function Atmosphere({ children, style, ...rest }: AtmosphereProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <div className="sd-orb" style={orbMint} />
      <div style={orbAccent} />
      <div style={grid} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const orbMint: CSSProperties = {
  position: 'absolute',
  width: 460,
  height: 460,
  borderRadius: '50%',
  top: -160,
  left: -140,
  background: 'rgba(31, 162, 160, 0.22)',
  filter: 'blur(2px)',
  pointerEvents: 'none',
};

const orbAccent: CSSProperties = {
  position: 'absolute',
  width: 420,
  height: 420,
  borderRadius: '50%',
  top: -100,
  right: -180,
  background: 'rgba(255, 77, 28, 0.16)',
  filter: 'blur(2px)',
  pointerEvents: 'none',
};

const grid: CSSProperties = {
  position: 'absolute',
  inset: 0,
  opacity: 0.4,
  backgroundImage:
    'linear-gradient(rgba(20,32,28,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(20,32,28,0.045) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  pointerEvents: 'none',
  maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent 85%)',
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});
