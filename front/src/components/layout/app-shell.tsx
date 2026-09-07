import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

import { AppFooter } from '@/components/layout/app-footer';
import { Layout, Spacing } from '@/constants/theme';
import { useBreakpoint } from '@/hooks/use-breakpoint';

type Props = {
  children: ReactNode;
  /** Sticky secondary column on wide screens; inlined into the flow otherwise. */
  aside?: ReactNode;
  /** On one column, place the aside above the main content instead of below it. */
  asideFirstOnCompact?: boolean;
  refreshControl?: ScrollViewProps['refreshControl'];
};

/** Sticky positioning has no native equivalent, so the rail just scrolls there. */
const stickyRail = Platform.select({
  web: { position: 'sticky', top: Layout.headerHeight + Spacing.four } as object,
  default: {},
});

export function AppShell({ children, aside, asideFirstOnCompact, refreshControl }: Props) {
  const { isTwoColumn, isCompact } = useBreakpoint();
  const showRail = !!aside && isTwoColumn;
  const inlineAside = !!aside && !isTwoColumn;

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}>
      <View
        style={[
          styles.shell,
          isCompact ? styles.shellCompact : styles.shellRoomy,
          isTwoColumn && styles.shellRow,
        ]}>
        {showRail ? (
          <View style={styles.rail}>
            <View style={[styles.railInner, stickyRail]}>
              {aside}
              <AppFooter />
            </View>
          </View>
        ) : null}

        <View style={[styles.main, !isTwoColumn && styles.mainSingle]}>
          {inlineAside && asideFirstOnCompact ? aside : null}
          {children}
          {inlineAside && !asideFirstOnCompact ? aside : null}
          {!isTwoColumn ? <AppFooter /> : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
  },
  shell: {
    width: '100%',
    maxWidth: Layout.shellWidth,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  shellCompact: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
  },
  shellRoomy: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
  },
  shellRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rail: {
    width: Layout.railWidth,
  },
  railInner: {
    gap: Spacing.two,
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.three,
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  mainSingle: {
    width: '100%',
    maxWidth: Layout.mainWidth,
    alignSelf: 'center',
  },
});
