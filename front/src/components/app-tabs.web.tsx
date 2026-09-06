import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import type { Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Icon, type IconName } from '@/components/ui/icon';
import { Layout, Palette, Radius, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';

const NAV: Record<string, { label: string; icon: IconName }> = {
  today: { label: 'Сегодня', icon: 'home' },
  course: { label: 'Курс', icon: 'cap' },
  progress: { label: 'Прогресс', icon: 'quiz' },
  project: { label: 'Проект', icon: 'code' },
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabList asChild>
        <GlobalHeader>
          <TabTrigger name="today" href="/today" asChild>
            <NavItem>today</NavItem>
          </TabTrigger>
          <TabTrigger name="course" href="/course" asChild>
            <NavItem>course</NavItem>
          </TabTrigger>
          <TabTrigger name="progress" href={'/progress' as Href} asChild>
            <NavItem>progress</NavItem>
          </TabTrigger>
          <TabTrigger name="project" href={'/project' as Href} asChild>
            <NavItem>project</NavItem>
          </TabTrigger>
        </GlobalHeader>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

/**
 * Full-bleed sticky bar whose inner row is aligned to the same grid as the
 * page below it, so the logo and content share a left edge.
 */
export function GlobalHeader(props: TabListProps) {
  const { isCompact } = useBreakpoint();

  return (
    <View {...props} style={styles.bar} pointerEvents="box-none">
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <ThemedText type="metaBold" style={styles.logoText}>
              SD
            </ThemedText>
          </View>
          {!isCompact ? (
            <ThemedText type="smallBold" style={styles.wordmark}>
              SelfDev
            </ThemedText>
          ) : null}
        </View>
        <View style={styles.nav}>{props.children}</View>
      </View>
    </View>
  );
}

/** Icon over label, with the active underline pinned to the bar's bottom edge. */
export function NavItem({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const item = NAV[String(children)] ?? { label: String(children), icon: 'home' as IconName };
  const color = isFocused ? Palette.ink : Palette.inkSoft;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}>
      <Icon name={item.icon} size={22} color={color} filled={!!isFocused} />
      <ThemedText type="meta" style={{ color }}>
        {item.label}
      </ThemedText>
      <View style={[styles.underline, isFocused && styles.underlineOn]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { flex: 1, height: '100%' },
  bar: {
    zIndex: 20,
    height: Layout.headerHeight,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    ...Platform.select({
      web: { position: 'sticky', top: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } as object,
      default: {},
    }),
  },
  inner: {
    maxWidth: Layout.shellWidth,
    width: '100%',
    alignSelf: 'center',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingLeft: Spacing.four,
    gap: Spacing.four,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: Radius.xs,
    backgroundColor: Palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: '#fff' },
  wordmark: { color: Palette.ink },
  nav: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  navItem: {
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingTop: 6,
    paddingHorizontal: Spacing.three,
  },
  navItemPressed: { backgroundColor: Palette.surfaceHover },
  underline: {
    height: 2,
    alignSelf: 'stretch',
    marginTop: 5,
    backgroundColor: 'transparent',
  },
  underlineOn: { backgroundColor: Palette.ink },
});
