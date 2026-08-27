import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import { Pressable, View, StyleSheet } from 'react-native';

import { ThemedText } from './themed-text';

import { HeaderInset, MaxContentWidth, Palette, Spacing } from '@/constants/theme';

const LABELS: Record<string, string> = {
  Home: 'Главная',
  Course: 'Курс',
  Today: 'Сегодня',
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>Home</TabButton>
          </TabTrigger>
          <TabTrigger name="course" href="/course" asChild>
            <TabButton>Course</TabButton>
          </TabTrigger>
          <TabTrigger name="today" href="/today" asChild>
            <TabButton>Today</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
      <TabSlot style={{ flex: 1, height: '100%' }} />
    </Tabs>
  );
}

export function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const label = LABELS[String(children)] ?? String(children);

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.tabHit, pressed && styles.pressed]}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}>
      <View style={styles.tabInner}>
        <ThemedText type="smallBold" style={isFocused ? styles.tabTextOn : styles.tabText}>
          {label}
        </ThemedText>
        <View style={[styles.underline, isFocused && styles.underlineOn]} />
      </View>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.header} pointerEvents="box-none">
      <View style={styles.inner}>
        <ThemedText type="smallBold" style={styles.brand}>
          SelfDev
        </ThemedText>
        <View style={styles.nav}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    zIndex: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.line,
    backgroundColor: 'rgba(244, 241, 232, 0.94)',
    // @ts-expect-error web backdrop
    backdropFilter: 'blur(12px)',
    minHeight: HeaderInset,
    justifyContent: 'flex-end',
  },
  inner: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  brand: {
    color: Palette.ink,
    letterSpacing: -0.3,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tabHit: {
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabInner: {
    alignItems: 'center',
    gap: 5,
    paddingVertical: 2,
  },
  tabText: {
    color: Palette.inkSoft,
    fontWeight: '600',
  },
  tabTextOn: {
    color: Palette.ink,
  },
  underline: {
    width: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  underlineOn: {
    backgroundColor: Palette.accent,
  },
});
