/**
 * 7ala9i spacing & radius tokens — Phase 0 of PREMIUM_UI_PLAN.md §2.5.
 *
 * 4pt grid. `screenPadding` (20) and `section` (28) are the two top-level
 * tokens the redesign leans on: 16 reads templated, 20 reads designed.
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,

  // New (§2.5)
  screenPadding: 20,
  section: 28,
} as const;

export type SpacingKey = keyof typeof spacing;

/**
 * Corner radii. Hero cards drop from 16 → 20 (§2.5); inputs stay 14;
 * chips/segments are pill-shaped.
 */
export const radius = {
  none: 0,
  sm: 6,
  input: 14,
  card: 16,
  hero: 20,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;
