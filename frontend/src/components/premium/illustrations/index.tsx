import React from 'react';
import Svg, { Path, Circle, Line, G } from 'react-native-svg';
import { colors } from '../../../theme/colors';

/**
 * §4.9 — four hand-drawn line illustrations used by EmptyState. Single accent
 * stroke, Mauritania-flavored (date-palm fronds, scissor, sand dune line).
 * All sized to a 120pt viewBox so callers control display size.
 */

interface IllustrationProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function base({ size, color, strokeWidth }: IllustrationProps) {
  return {
    width: size ?? 120,
    height: size ?? 120,
    stroke: color ?? colors.accent,
    strokeWidth: strokeWidth ?? 1.6,
  };
}

/** Empty bookings — calendar grid with a date palm sprouting from corner. */
export function EmptyBookingsIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* calendar frame */}
        <Path d="M22 38 H86 V90 H22 Z" />
        <Line x1="22" y1="50" x2="86" y2="50" />
        <Line x1="34" y1="32" x2="34" y2="42" />
        <Line x1="74" y1="32" x2="74" y2="42" />
        {/* faint grid */}
        <Line x1="38" y1="60" x2="42" y2="60" opacity="0.5" />
        <Line x1="52" y1="60" x2="56" y2="60" opacity="0.5" />
        <Line x1="66" y1="60" x2="70" y2="60" opacity="0.5" />
        <Line x1="38" y1="72" x2="42" y2="72" opacity="0.5" />
        <Line x1="52" y1="72" x2="56" y2="72" opacity="0.5" />
        {/* date palm trunk sprouting from corner */}
        <Path d="M92 90 C 92 72, 96 60, 100 48" />
        {/* palm fronds */}
        <Path d="M100 48 C 95 42, 90 40, 84 40" />
        <Path d="M100 48 C 105 42, 110 40, 114 42" />
        <Path d="M100 48 C 96 42, 94 36, 96 30" />
        <Path d="M100 48 C 104 42, 106 36, 108 32" />
      </G>
    </Svg>
  );
}

/** Empty favorites — heart with stylized open scissors silhouette inside. */
export function EmptyFavoritesIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* heart */}
        <Path d="M60 92 C 18 66, 26 30, 50 32 C 56 32, 60 36, 60 42 C 60 36, 64 32, 70 32 C 94 30, 102 66, 60 92 Z" />
        {/* scissor blades */}
        <Path d="M48 56 L 64 68 L 76 76" />
        <Path d="M72 56 L 56 68 L 44 76" />
        {/* finger loops */}
        <Circle cx="42" cy="78" r="4" />
        <Circle cx="78" cy="78" r="4" />
      </G>
    </Svg>
  );
}

/** No search results — magnifying glass over a sand-dune horizon line. */
export function NoResultsIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* dune horizon */}
        <Path d="M8 88 C 24 80, 38 84, 52 78 C 68 70, 80 84, 96 80 C 104 78, 110 82, 112 84" opacity="0.55" />
        {/* magnifier */}
        <Circle cx="54" cy="48" r="22" />
        <Line x1="70" y1="64" x2="86" y2="80" />
        {/* dot inside (sun behind) */}
        <Circle cx="54" cy="48" r="3" />
      </G>
    </Svg>
  );
}

/** Auth #1 — pin marker over a sand-dune horizon ("find a salon near you"). */
export function AuthDiscoverIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* dune horizon */}
        <Path d="M6 92 C 22 84, 38 88, 54 82 C 70 76, 84 88, 100 84 C 108 82, 114 84, 116 86" opacity="0.5" />
        {/* second dune */}
        <Path d="M6 96 C 24 92, 44 94, 64 90 C 84 86, 102 96, 116 92" opacity="0.35" />
        {/* pin marker */}
        <Path d="M60 28 C 48 28, 40 38, 40 50 C 40 64, 60 84, 60 84 C 60 84, 80 64, 80 50 C 80 38, 72 28, 60 28 Z" />
        <Circle cx="60" cy="50" r="8" />
        {/* sun */}
        <Circle cx="98" cy="34" r="5" opacity="0.7" />
      </G>
    </Svg>
  );
}

/** Auth #2 — calendar grid with a checkmark ("book in seconds"). */
export function AuthBookIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* calendar */}
        <Path d="M24 36 H96 V92 H24 Z" />
        <Line x1="24" y1="50" x2="96" y2="50" />
        <Line x1="38" y1="28" x2="38" y2="40" />
        <Line x1="82" y1="28" x2="82" y2="40" />
        {/* tiny grid */}
        <Line x1="40" y1="62" x2="46" y2="62" opacity="0.5" />
        <Line x1="56" y1="62" x2="62" y2="62" opacity="0.5" />
        <Line x1="72" y1="62" x2="78" y2="62" opacity="0.5" />
        <Line x1="40" y1="74" x2="46" y2="74" opacity="0.5" />
        {/* check */}
        <Path d="M52 78 L 60 86 L 76 70" strokeWidth={strokeWidth + 0.6} />
      </G>
    </Svg>
  );
}

/** Auth #3 — open scissors + comb ("a barber for every cut"). */
export function AuthBarberIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* comb */}
        <Path d="M24 70 H 96 V 76 H 24 Z" />
        <Line x1="30" y1="76" x2="30" y2="86" />
        <Line x1="38" y1="76" x2="38" y2="88" />
        <Line x1="46" y1="76" x2="46" y2="90" />
        <Line x1="54" y1="76" x2="54" y2="90" />
        <Line x1="62" y1="76" x2="62" y2="90" />
        <Line x1="70" y1="76" x2="70" y2="88" />
        <Line x1="78" y1="76" x2="78" y2="86" />
        {/* scissors above */}
        <Path d="M44 30 L 64 50 L 84 58" />
        <Path d="M80 30 L 60 50 L 40 58" />
        <Circle cx="38" cy="60" r="5" />
        <Circle cx="86" cy="60" r="5" />
      </G>
    </Svg>
  );
}

/** Auth wordmark — stylized seven-blade + crescent, used on Welcome hero. */
export function AuthWordmarkIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth + 0.4} strokeLinecap="round" strokeLinejoin="round">
        {/* crescent */}
        <Path d="M84 26 C 70 30, 62 44, 64 60 C 66 76, 80 88, 96 86 C 86 84, 76 74, 76 60 C 76 46, 86 36, 96 34 C 92 28, 88 26, 84 26 Z" />
        {/* scissor over crescent */}
        <Path d="M30 36 L 56 60 L 70 70" />
        <Path d="M30 84 L 56 60 L 70 50" />
        <Circle cx="24" cy="34" r="5" />
        <Circle cx="24" cy="86" r="5" />
      </G>
    </Svg>
  );
}

/** No reviews — chat bubble with three stars inside. */
export function NoReviewsIllustration(props: IllustrationProps = {}) {
  const { width, height, stroke, strokeWidth } = base(props);
  return (
    <Svg width={width} height={height} viewBox="0 0 120 120" fill="none">
      <G stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        {/* speech bubble */}
        <Path d="M22 36 H98 V78 H50 L38 90 V78 H22 Z" />
        {/* three stars (simplified) */}
        <Path d="M38 56 L 40 62 L 46 62 L 41 65 L 43 71 L 38 67 L 33 71 L 35 65 L 30 62 L 36 62 Z" />
        <Path d="M60 56 L 62 62 L 68 62 L 63 65 L 65 71 L 60 67 L 55 71 L 57 65 L 52 62 L 58 62 Z" />
        <Path d="M82 56 L 84 62 L 90 62 L 85 65 L 87 71 L 82 67 L 77 71 L 79 65 L 74 62 L 80 62 Z" />
      </G>
    </Svg>
  );
}
