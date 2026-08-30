import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Palette } from '@/constants/theme';

export type IconName =
  | 'home'
  | 'grid'
  | 'book'
  | 'chat'
  | 'back'
  | 'check'
  | 'checkCircle'
  | 'lock'
  | 'clock'
  | 'send'
  | 'close'
  | 'link'
  | 'sparkle'
  | 'chevronRight'
  | 'refresh';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
};

/**
 * Solid-first glyphs at a 24px grid, matching the weight of LinkedIn's icon set.
 * `filled` switches nav glyphs between the active/inactive pair.
 */
export function Icon({ name, size = 24, color = Palette.ink, filled = true }: Props) {
  const stroke = color;
  const fill = filled ? color : 'none';

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'home' ? (
        <Path
          d="M12 3.2 2.8 10.4V21h6.4v-6.2h5.6V21h6.4V10.4L12 3.2Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={filled ? 0 : 1.8}
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'grid' ? (
        <>
          <Rect
            x={3}
            y={3}
            width={7.5}
            height={7.5}
            rx={1.6}
            fill={fill}
            stroke={stroke}
            strokeWidth={filled ? 0 : 1.8}
          />
          <Rect
            x={13.5}
            y={3}
            width={7.5}
            height={7.5}
            rx={1.6}
            fill={fill}
            stroke={stroke}
            strokeWidth={filled ? 0 : 1.8}
          />
          <Rect
            x={3}
            y={13.5}
            width={7.5}
            height={7.5}
            rx={1.6}
            fill={fill}
            stroke={stroke}
            strokeWidth={filled ? 0 : 1.8}
          />
          <Rect
            x={13.5}
            y={13.5}
            width={7.5}
            height={7.5}
            rx={1.6}
            fill={fill}
            stroke={stroke}
            strokeWidth={filled ? 0 : 1.8}
          />
        </>
      ) : null}

      {name === 'book' ? (
        <Path
          d="M4 4.5h5.2c1.6 0 2.8.9 2.8 2.2V20c0-1.1-1.2-1.9-2.8-1.9H4V4.5Zm16 0h-5.2c-1.6 0-2.8.9-2.8 2.2V20c0-1.1 1.2-1.9 2.8-1.9H20V4.5Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={filled ? 0 : 1.7}
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'chat' ? (
        <Path
          d="M12 3c5 0 9 3.4 9 7.7 0 4.2-4 7.6-9 7.6-.9 0-1.7-.1-2.5-.3L4 21l1.3-3.6C3.9 16 3 13.5 3 10.7 3 6.4 7 3 12 3Z"
          fill={fill}
          stroke={stroke}
          strokeWidth={filled ? 0 : 1.7}
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'back' ? (
        <Path
          d="M15 4.5 7.5 12l7.5 7.5"
          stroke={stroke}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'chevronRight' ? (
        <Path
          d="M9 4.5 16.5 12 9 19.5"
          stroke={stroke}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'check' ? (
        <Path
          d="M4.5 12.8 9.3 17.5 19.5 6.8"
          stroke={stroke}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'checkCircle' ? (
        <>
          <Circle cx={12} cy={12} r={9.2} fill={fill} stroke={stroke} strokeWidth={filled ? 0 : 1.8} />
          <Path
            d="M7.8 12.4 10.8 15.4 16.4 9"
            stroke={filled ? '#fff' : stroke}
            strokeWidth={2.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}

      {name === 'lock' ? (
        <>
          <Rect x={4.5} y={10.5} width={15} height={10} rx={2.2} fill={fill} />
          <Path
            d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"
            stroke={stroke}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </>
      ) : null}

      {name === 'clock' ? (
        <>
          <Circle cx={12} cy={12} r={8.8} stroke={stroke} strokeWidth={1.8} />
          <Path
            d="M12 6.8V12l3.6 2.2"
            stroke={stroke}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : null}

      {name === 'send' ? (
        <Path d="M3 3.6 21.5 12 3 20.4l3.2-8.4L3 3.6Z" fill={fill} />
      ) : null}

      {name === 'close' ? (
        <Path
          d="M5.6 5.6 18.4 18.4M18.4 5.6 5.6 18.4"
          stroke={stroke}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      ) : null}

      {name === 'link' ? (
        <Path
          d="M10.5 13.5a3.8 3.8 0 0 0 5.4 0l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.3 1.3M13.5 10.5a3.8 3.8 0 0 0-5.4 0l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.3-1.3"
          stroke={stroke}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {name === 'sparkle' ? (
        <Path
          d="M12 2.8 13.9 9 20 10.9 13.9 12.8 12 19 10.1 12.8 4 10.9 10.1 9 12 2.8Z"
          fill={fill}
        />
      ) : null}

      {name === 'refresh' ? (
        <Path
          d="M20 12a8 8 0 1 1-2.6-5.9M20 4.2v4.6h-4.6"
          stroke={stroke}
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </Svg>
  );
}
