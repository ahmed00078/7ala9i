/**
 * 7ala9i — editorial palette (Phase 0 of PREMIUM_UI_PLAN.md §2.3).
 *
 * Two tiers:
 *   1. The *new* tokens (ink, canvas, accent, …) drive all premium components
 *      built from Phase 1 onward. Reach for these first.
 *   2. The *legacy* tokens (background, navy, gray…) are kept as aliases mapped
 *      to their new editorial equivalents, so the 37 pre-existing screens pick
 *      up the warm canvas + desaturated accent automatically. They will be
 *      removed phase-by-phase as each screen is redesigned.
 */
export const colors = {
  // ── Surfaces — warm, near-monochrome ─────────────────────────────────────
  ink: '#0B0E14',         // primary text / strong surfaces
  inkSoft: '#1A1F2A',     // hero blocks, owner header
  slate: '#5B6573',       // body text on light
  slateSoft: '#8A93A1',   // captions / meta
  hairline: '#E6E8EC',    // 0.5px dividers (NOT borders)
  canvas: '#F7F6F2',      // app bg — warm off-white, not blue-grey
  surface: '#FFFFFF',     // card bg
  surfaceAlt: '#F2EFEA',  // secondary card bg (warmer paper feel)

  // ── Accent — single, confident teal ──────────────────────────────────────
  accent: '#0F7A6C',
  accentInk: '#063A33',   // accent text on light bg
  accentSoft: '#DDEFEB',  // accent on white tint
  accentWash: '#F0F7F5',  // very subtle wash for selected rows

  // ── Semantic — muted, not neon ───────────────────────────────────────────
  ok: '#2E7D5B',
  warn: '#B5651D',
  danger: '#B3261E',
  star: '#D4A24A',        // warm gold not bright yellow

  // ── Utility ──────────────────────────────────────────────────────────────
  white: '#FFFFFF',
  transparent: 'transparent',

  // ── Legacy aliases — DO NOT use in new code. Removed phase-by-phase. ─────
  background: '#F7F6F2',      // → canvas
  black: '#0B0E14',           // → ink
  navy: '#1A1F2A',            // → inkSoft
  navyLight: '#242A38',       // → inkSoft (slight variant)
  accentLight: '#DDEFEB',     // → accentSoft
  accentDark: '#063A33',      // → accentInk
  border: '#E6E8EC',          // → hairline
  gray: '#8A93A1',            // → slateSoft
  grayDark: '#5B6573',        // → slate
  grayLight: '#D2D5DA',       // muted neutral
  success: '#2E7D5B',         // → ok
  successLight: '#DDEFEB',
  successDark: '#1F5A40',
  error: '#B3261E',           // → danger
  errorLight: '#F6E0DE',
  warning: '#B5651D',         // → warn
  warningLight: '#F2E6D7',
  info: '#0F7A6C',            // collapsed onto accent — no more blue info
  infoLight: '#DDEFEB',
  purple: '#0F7A6C',          // killed — collapsed onto accent (§9: "no purple")
  purpleLight: '#DDEFEB',
} as const;

export type ColorKey = keyof typeof colors;
