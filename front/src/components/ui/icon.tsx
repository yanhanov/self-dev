import type { ReactElement } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

export type IconName =
  | 'home'
  | 'cap'
  | 'chat'
  | 'article'
  | 'code'
  | 'quiz'
  | 'check'
  | 'checkCircle'
  | 'lock'
  | 'clock'
  | 'send'
  | 'close'
  | 'link'
  | 'sparkle'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronUp'
  | 'search'
  | 'user'
  | 'calendar'
  | 'play'
  | 'refresh';

type Ctx = {
  /** Stroke/fill colour. */
  c: string;
  /** Active state: render the purpose-drawn solid variant where one exists. */
  filled: boolean;
  /** Stroke width, scaled so small icons stay legible. */
  sw: number;
};

/**
 * Every glyph is drawn on a 24px grid. Solid and outline variants are drawn
 * separately instead of toggling fill on one path, so active states keep their
 * interior detail (a door in the house, a gap under the mortarboard) rather
 * than collapsing into a silhouette.
 */
const ICONS: Record<IconName, (ctx: Ctx) => ReactElement> = {
  home: ({ c, filled, sw }) => {
    const d = 'M3.6 10.7 12 4l8.4 6.7v9.8h-5.7v-6.1H9.3v6.1H3.6v-9.8Z';
    return filled ? (
      <Path d={d} fill={c} />
    ) : (
      <Path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
    );
  },

  cap: ({ c, filled, sw }) =>
    filled ? (
      <>
        <Path d="M12 3.6 2.4 8.1 12 12.6l9.6-4.5L12 3.6Z" fill={c} />
        <Path
          d="M6.8 10.7 12 13.1l5.2-2.4v4.2c0 1.6-2.3 2.9-5.2 2.9s-5.2-1.3-5.2-2.9v-4.2Z"
          fill={c}
        />
        <Path d="M21.6 8.6v5.2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </>
    ) : (
      <>
        <Path
          d="M12 3.6 2.4 8.1 12 12.6l9.6-4.5L12 3.6Z"
          fill="none"
          stroke={c}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <Path
          d="M6.8 10.9v4c0 1.6 2.3 2.9 5.2 2.9s5.2-1.3 5.2-2.9v-4"
          fill="none"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path d="M21.6 8.6v5.2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </>
    ),

  chat: ({ c, filled, sw }) => {
    const d =
      'M4.6 3.6h14.8a2.1 2.1 0 0 1 2.1 2.1v8.8a2.1 2.1 0 0 1-2.1 2.1h-9.1l-4.6 3.9v-3.9h-1.1a2.1 2.1 0 0 1-2.1-2.1V5.7a2.1 2.1 0 0 1 2.1-2.1Z';
    return filled ? (
      <Path d={d} fill={c} />
    ) : (
      <Path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
    );
  },

  article: ({ c, sw }) => (
    <>
      <Path
        d="M6.2 3.2h7l5.4 5.2v12.4H6.2V3.2Z"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <Path
        d="M13.2 3.4v5.2h5.2"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinejoin="round"
      />
      <Path d="M9 12.8h6.4M9 16.4h4.2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),

  code: ({ c }) => (
    <Path
      d="M9.4 7.4 4.6 12l4.8 4.6M14.6 7.4 19.4 12l-4.8 4.6"
      fill="none"
      stroke={c}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),

  quiz: ({ c, sw }) => (
    <>
      <Path
        d="M9.2 4.8H7.4a1.8 1.8 0 0 0-1.8 1.8v12.8a1.8 1.8 0 0 0 1.8 1.8h9.2a1.8 1.8 0 0 0 1.8-1.8V6.6a1.8 1.8 0 0 0-1.8-1.8h-1.8"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x={9.2}
        y={2.6}
        width={5.6}
        height={4}
        rx={1.2}
        fill="none"
        stroke={c}
        strokeWidth={sw}
      />
      <Path
        d="M8.9 13.6 11.2 15.9 15.5 11.2"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  check: ({ c }) => (
    <Path
      d="M4.8 12.6 9.6 17.4 19.2 6.9"
      fill="none"
      stroke={c}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),

  checkCircle: ({ c, filled, sw }) =>
    filled ? (
      <>
        <Circle cx={12} cy={12} r={9.4} fill={c} />
        <Path
          d="M7.9 12.3 10.7 15.1 16.1 9.2"
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <>
        <Circle cx={12} cy={12} r={9.1} fill="none" stroke={c} strokeWidth={sw} />
        <Path
          d="M7.9 12.3 10.7 15.1 16.1 9.2"
          fill="none"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

  lock: ({ c, filled, sw }) => (
    <>
      <Path
        d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
      />
      {filled ? (
        <Rect x={4.6} y={10.2} width={14.8} height={10.4} rx={2.4} fill={c} />
      ) : (
        <Rect
          x={4.6}
          y={10.2}
          width={14.8}
          height={10.4}
          rx={2.4}
          fill="none"
          stroke={c}
          strokeWidth={sw}
        />
      )}
    </>
  ),

  clock: ({ c, sw }) => (
    <>
      <Circle cx={12} cy={12} r={8.8} fill="none" stroke={c} strokeWidth={sw} />
      <Path
        d="M12 6.9v5.3l3.4 2"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  send: ({ c, filled, sw }) => {
    const d = 'M21.4 12 3.1 4.2l2.8 7.8-2.8 7.8L21.4 12Z';
    return filled ? (
      <Path d={d} fill={c} />
    ) : (
      <>
        <Path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
        <Path d="M5.9 12h7.2" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      </>
    );
  },

  close: ({ c }) => (
    <Path
      d="M5.8 5.8 18.2 18.2M18.2 5.8 5.8 18.2"
      fill="none"
      stroke={c}
      strokeWidth={2}
      strokeLinecap="round"
    />
  ),

  link: ({ c, sw }) => (
    <>
      <Path
        d="M14 4.4h5.6V10"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M19.6 4.4 11.4 12.6" stroke={c} strokeWidth={sw} strokeLinecap="round" />
      <Path
        d="M17.6 13.8v4.4a1.8 1.8 0 0 1-1.8 1.8H5.6a1.8 1.8 0 0 1-1.8-1.8V8a1.8 1.8 0 0 1 1.8-1.8H10"
        fill="none"
        stroke={c}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  sparkle: ({ c, filled, sw }) => {
    const d = 'M12 3c.6 4.6 3.4 7.4 8 8-4.6.6-7.4 3.4-8 8-.6-4.6-3.4-7.4-8-8 4.6-.6 7.4-3.4 8-8Z';
    return filled ? (
      <Path d={d} fill={c} />
    ) : (
      <Path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
    );
  },

  chevronLeft: ({ c }) => (
    <Path
      d="M15 5.4 8.4 12 15 18.6"
      fill="none"
      stroke={c}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),

  chevronRight: ({ c }) => (
    <Path
      d="M9 5.4 15.6 12 9 18.6"
      fill="none"
      stroke={c}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),

  chevronUp: ({ c }) => (
    <Path
      d="M5.4 15 12 8.4 18.6 15"
      fill="none"
      stroke={c}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),

  search: ({ c, sw }) => (
    <>
      <Circle cx={10.8} cy={10.8} r={6.6} fill="none" stroke={c} strokeWidth={sw} />
      <Path d="M15.7 15.7 20.4 20.4" stroke={c} strokeWidth={2} strokeLinecap="round" />
    </>
  ),

  user: ({ c, filled, sw }) =>
    filled ? (
      <>
        <Circle cx={12} cy={8.4} r={3.9} fill={c} />
        <Path d="M4.6 20.6a7.4 7.4 0 0 1 14.8 0Z" fill={c} />
      </>
    ) : (
      <>
        <Circle cx={12} cy={8.4} r={3.9} fill="none" stroke={c} strokeWidth={sw} />
        <Path
          d="M4.6 20.6a7.4 7.4 0 0 1 14.8 0"
          fill="none"
          stroke={c}
          strokeWidth={sw}
          strokeLinecap="round"
        />
      </>
    ),

  calendar: ({ c, sw }) => (
    <>
      <Rect
        x={3.4}
        y={5.2}
        width={17.2}
        height={15.4}
        rx={2.2}
        fill="none"
        stroke={c}
        strokeWidth={sw}
      />
      <Path d="M3.4 10h17.2" stroke={c} strokeWidth={sw} />
      <Path d="M8 3.4v3.4M16 3.4v3.4" stroke={c} strokeWidth={sw} strokeLinecap="round" />
    </>
  ),

  play: ({ c, filled, sw }) => {
    const d = 'M8.2 5.4 19 12 8.2 18.6V5.4Z';
    return filled ? (
      <Path d={d} fill={c} />
    ) : (
      <Path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" />
    );
  },

  refresh: ({ c, sw }) => (
    <Path
      d="M20 12a8 8 0 1 1-2.6-5.9M20 4.2v4.6h-4.6"
      fill="none"
      stroke={c}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
};

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
};

export function Icon({ name, size = 24, color = Palette.ink, filled = false }: Props) {
  // Small glyphs need a proportionally heavier stroke to keep the same optical weight.
  const strokeWidth = size <= 16 ? 2 : size <= 20 ? 1.85 : 1.7;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {ICONS[name]({ c: color, filled, sw: strokeWidth })}
    </Svg>
  );
}
