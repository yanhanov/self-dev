import { useWindowDimensions } from 'react-native';

import { Layout } from '@/constants/theme';

export function useBreakpoint() {
  const { width } = useWindowDimensions();

  return {
    width,
    /** Phone-sized: tighten gutters and drop secondary chrome. */
    isCompact: width < Layout.compactAt,
    /** Wide enough for the sticky rail beside the main column. */
    isTwoColumn: width >= Layout.twoColumnAt,
  };
}
