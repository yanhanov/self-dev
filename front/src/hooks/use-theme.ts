import { Colors } from '@/constants/theme';

/** SelfDev is light-first; ignore OS dark preference for product UI. */
export function useTheme() {
  return Colors.light;
}
