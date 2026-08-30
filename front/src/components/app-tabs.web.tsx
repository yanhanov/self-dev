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

import { Icon, type IconName } from '@/components/ui/icon';
import { HeaderInset, MaxContentWidth, Palette, Radius, Spacing } from '@/constants/theme';

const NAV: Record<string, { label: string; icon: IconName }> = {
  course: { label: 'Курс', icon: 'book' },
  today: { label: 'Сегодня', icon: 'home' },
};

export default function AppTabs() {
  return (
    <Tabs>
      <TabList asChild>
        <GlobalNav>
          <TabTrigger name="course" href="/course" asChild>
            <NavItem>course</NavItem>
          </TabTrigger>
          <TabTrigger name="today" href="/today" asChild>
            <NavItem>today</NavItem>
          </TabTrigger>
        </GlobalNav>
      </TabList>
      <TabSlot style={{ flex: 1, height: '100%' }} />
    </Tabs>
  );
}

/** Icon-over-label nav item with the active underline pinned to the bar's bottom edge. */
export function NavItem({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const item = NAV[String(children)] ?? { label: String(children), icon: 'home' as IconName };
  const color = isFocused ? Palette.ink : Palette.inkSoft;

  return (
    <Pressable
      {...props}
      style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}>
      <Icon name={item.icon} size={24} color={color} filled={!!isFocused} />
      <ThemedText type="meta" style={{ color }}>
        {item.label}
      </ThemedText>
      <View style={[styles.underline, isFocused && styles.underlineOn]} />
    </Pressable>
  );
}

export function GlobalNav(props: TabListProps) {
  return (
    <View {...props} style={styles.bar} pointerEvents="box-none">
      <View style={styles.inner}>
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <ThemedText type="metaBold" style={styles.logoText}>
              SD
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={styles.wordmark}>
            SelfDev
          </ThemedText>
        </View>
        <View style={styles.nav}>{props.children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    zIndex: 20,
    minHeight: HeaderInset,
    backgroundColor: Palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: Palette.line,
    justifyContent: 'center',
    ...({ position: 'sticky', top: 0 } as object),
  },
  inner: {
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    minHeight: HeaderInset,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: Radius.xs,
    backgroundColor: Palette.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 14,
  },
  wordmark: {
    color: Palette.ink,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  navItem: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  navItemPressed: {
    backgroundColor: Palette.surfaceHover,
  },
  underline: {
    height: 2,
    alignSelf: 'stretch',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  underlineOn: {
    backgroundColor: Palette.ink,
  },
});
