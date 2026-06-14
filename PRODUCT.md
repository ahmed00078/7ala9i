# Product

## Register

product

## Users

Two-sided marketplace, both audiences on phones (Android-first), most on budget or mid-range devices, often on flaky 3G.

- **Clients** — people in Nouakchott (and eventually the rest of Mauritania) looking up a barbershop nearby, picking a slot, and showing up. They are in a casual planning task: between meetings, on the bus, before Friday prayer. The interface is one tool among many on their phone; speed and clarity beat depth. Trilingual (FR / AR / EN), with Arabic readers expecting RTL parity, not a mirrored afterthought.
- **Salon owners** — barbershop operators running their day-to-day: confirming the next appointment, rescheduling a no-show, editing service prices, glancing at the week's revenue. They are *in* the business, often using the app between cuts. They need calm, dense, glanceable surfaces — never a dashboard that demands study.

## Product Purpose

7ala9i (حلاقي) lets Mauritanian clients book a barbershop appointment in under 60 seconds and lets salon owners run a real business from a phone — no spreadsheet, no WhatsApp thread. It exists because the local market today coordinates through phone calls and "walk in and wait," which scales poorly for owners and disrespects clients' time. Payment happens at the salon (cash / Bankily / Sedad), so the app is purely the coordination layer.

Success looks like: an owner who keeps the app open all day because it earns its place on the home screen, and a client who books a second time without thinking about it.

## Brand Personality

Three words: **calm, editorial, confident**.

The voice is the voice of a well-run shop — quiet, sure of itself, no upsell. Never chatty, never emoji-shouty, never "Hey 👋 ready to book?". A premium tool a barbershop owner is *proud* to keep open on their phone next to the till. Arabic is treated as a design language alongside French, not as an afterthought translation; the same restraint applies in both directions.

Emotional goals:
- Client at booking: "this is the easy choice."
- Owner at end of day: "I ran my business today."

Reference points (the *specific* thing about them that fits, not the generic vibe):
- **Linear** — every interaction has weight; nothing is decoration; keyboard / gesture confidence.
- **Things 3** — restraint as a value proposition; warmth in a productivity tool.
- **Mubi** — editorial typography in a transactional app; one font does a lot of work.
- **Cash App** — clarity of money flows in a single confident accent.
- **Headspace** — calm at the layout level, not just in the marketing copy.

## Anti-references

What this is **not**:

- **Dashboard-template purple / indigo / multi-color icon tiles.** No #6366F1, no pastel rounded squares in a 2×2 grid, no "Material You template" look.
- **Bootstrap admin panel.** No cold blue-grey body bg, no symmetric stat-card walls, no hard borders on every input.
- **Enterprise SaaS landing.** No gradient hero, no "Built with React" footer energy, no over-decorated CTAs.
- **Generic Latin-first UI that translates to Arabic at the last step.** Mirrored layouts where icons end up on the wrong side, Tajawal squeezed into a font slot designed for Inter, RTL "supported" but not designed.
- **Loud dashboards with emoji KPIs.** 🚀 📈 ✅ for stats — never.
- **Skeuomorphic "premium" tropes.** Glass-morphism, neumorphism, gold gradients, leather textures.
- **Marketing-app delight.** Confetti on booking confirm, animated mascots, Lottie heroes that play once and never again.

## Design Principles

1. **Restraint earns the accent.** One teal accent does work; everything else is ink + canvas. A second color shows up only when it carries semantic meaning (success, danger). When in doubt, remove a color, not add one.
2. **Tactility is felt, not seen.** Every press, sheet, and transition has a measured response — scale on press, spring on sheet, light haptic on primary actions. Motion conveys state; it never decorates. Animations stay under ~250ms; nothing animates that the user triggers dozens of times a day.
3. **Arabic is a first-class design surface.** Layout, typography weight, line-height, and motion are tuned for both Latin and Arabic readers. RTL is the default test, not the regression check.
4. **Owners are in flow, clients are passing through.** Owner screens reward density and repeat use (glanceable, no celebration on routine actions); client screens reward first-time clarity (one decision per screen, no clever shortcuts).
5. **Familiarity beats novelty.** Standard navigation, standard form controls, standard affordances. The tool disappears into the task. Delight is reserved for moments — a booking confirmed, a review left — never sprinkled across the surface.
6. **Phone-first, low-end Android-real.** The reference device is a mid-range Android on 3G, not a 14 Pro on Wi-Fi. Bundle size, render cost, and skeleton states are design concerns, not engineering concerns.

## Accessibility & Inclusion

Target: **WCAG 2.1 AA** for contrast and tap-target size, with realistic exceptions documented case-by-case.

- **Contrast:** body text ≥4.5:1 against its surface; large text (≥18px or bold ≥14px) ≥3:1. Placeholder text is held to the same body-text ratio. The slate / slateSoft ramp must be audited per surface, not assumed.
- **Tap targets:** ≥44×44 logical px on all interactive elements; pressables in dense rows get hit-slop, not visual padding.
- **Motion:** every animation honors the system "reduced motion" setting — crossfade or instant transition as the fallback. No motion that conveys load-bearing state without a non-motion equivalent.
- **RTL Arabic parity:** layouts, icons, motion direction, and reading order are designed for RTL, not auto-flipped. Tajawal-specific weight remapping (no 600 → 700) is permanent, not a workaround.
- **Trilingual copy:** every user-facing string lives in `en.json` / `fr.json` / `ar.json` simultaneously. Copy length variance across languages is a layout constraint, not a translation bug.
- **Offline tolerance:** flaky-connection flows use skeleton states (not spinners), optimistic UI for low-risk actions, and explicit retry affordances. Errors say what happened and what the user can do — never "Something went wrong."
- **Low-end Android perf:** Reanimated worklets only, no JS-driven animations on the booking / calendar critical paths; image grids paginate; lists virtualize past ~20 rows.
