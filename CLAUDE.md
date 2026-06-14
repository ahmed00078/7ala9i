# CLAUDE.md

Guidance for Claude Code working in this repo. This file is canonical — when `AGENTS.md` or `.github/copilot-instructions.md` disagree, trust this file and update the others.

## Project

**7ala9i (حلاقي)** — Barbershop booking app for Mauritania. Two-sided marketplace (client / salon owner / admin).
**Stack:** React Native (Expo SDK 55) + FastAPI + PostgreSQL (Railway in prod). All code under `7ala9i/`.

## Working with this repo — use every tool you have

This app must feel **handcrafted, not AI-generated**. That bar is only reachable if you actually use the tooling available — don't free-solo work that a skill, agent, or MCP would do better.

**Before writing UI code, invoke a design skill:**
- `impeccable` — for any UI redesign, polish, audit, motion, hierarchy, or anti-AI-aesthetic work. Use this by default whenever you touch a screen.
- `emil-design-eng` — for component-level polish, micro-interactions, and the invisible details (timing curves, focus states, empty states, perceived performance).
- `frontend-design` — when creating new screens or components from scratch.

**Use specialized agents instead of grinding through tasks inline:**
- `Explore` — for any "where is X / which files reference Y" lookup that would otherwise take 3+ greps. It's faster and protects your context.
- `Plan` — before non-trivial implementations, get a step-by-step plan with critical files and tradeoffs.
- `general-purpose` — multi-step research or open-ended investigations.

**Use skills for end-to-end flows, not just one-offs:**
- `verify` — after any non-trivial change, run the app and confirm the feature actually works. Don't claim "done" without it.
- `run` — to launch the app and observe behavior (not just type-check).
- `code-review` / `simplify` — review the diff before declaring a task complete.
- `claude-api` only applies if we add Claude-API integrations — currently we don't.

**MCP servers available:**
- `postgres` — connected to the **production Railway DB**. **READ-ONLY** (`SELECT` only, never write). Confirm with user before expensive queries. Never echo sensitive fields (passwords, tokens, emails).
- `context7` — fetch up-to-date docs for any library (Expo, React Native, FastAPI, TanStack Query, etc.) instead of relying on stale training data.

**Other tools you should reach for:**
- TodoWrite — for any task with ≥3 steps. Tick items as you finish them, not in batches.
- Multi-tool parallel calls — when reads are independent (e.g., reading 4 unrelated files), call them in one message.
- Don't hand-compose `mkdir`/`cat`/`echo` chains. Use `Read`, `Write`, `Edit`, and dedicated tools.

If a skill/agent matches the task, use it **without asking first**. Asking "should I use the impeccable skill?" wastes a round-trip — just invoke it.

## Commands

### Backend (`7ala9i/backend/`, **Windows PowerShell, not WSL**)
```powershell
venv\Scripts\activate
uvicorn app.main:app --reload          # http://localhost:8000 (docs at /docs)
alembic revision --autogenerate -m "msg"
alembic upgrade head
python seed.py
```

### Frontend (`7ala9i/frontend/`)
```bash
npm install
npx expo start                          # 'a' for Android emulator
```

### Database
```bash
cd 7ala9i && docker-compose up -d       # PostgreSQL 16 on :5432
```

### Cloud builds (WSL)
EAS misbehaves with `/mnt/c/...` paths — copy `frontend/` to `~/` first. Keep APK + AAB dest dirs separate.
```bash
# APK preview
rm -rf ~/7ala9i-build && cp -r /mnt/c/Users/asidimoh/Documents/Moi/planity3/7ala9i/frontend ~/7ala9i-build
cd ~/7ala9i-build && rm -rf android node_modules package-lock.json && npm install
EAS_NO_VCS=1 eas build --platform android --profile preview

# AAB production — same recipe, swap dir to ~/7ala9i-build-prod, profile to production
```

### Seed accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@halagi.mr | admin123 |
| Owner | ahmed@halagi.mr | owner123 |
| Client | client@halagi.mr | client123 |

## Architecture

### Backend (`backend/app/`) — fully async
- `main.py` — FastAPI app, router registration, `/uploads` static, APScheduler push reminders (5 min).
- `api/deps.py` — `get_db`, `get_current_user`, `require_role`.
- `api/v1/` — one router per domain: auth, salons, bookings, reviews, favorites, users, owner, admin, push_tokens, notifications.
- `models/` — SQLAlchemy ORM. `schemas/` — Pydantic Create/Update/Response (`from_attributes=True` + `model_validate()`).
- `services/booking_service.py` — slot locking via `SELECT FOR UPDATE`. `notification_service.py`, `reminder_service.py`, `sms_service.py` (OTP).
- `utils/security.py` — JWT HS256 + bcrypt. `utils/time_slots.py` — 30-min interval generation.

### Frontend (`frontend/src/`)
- `api/client.ts` — axios, base `http://10.0.2.2:8000/api/v1` (Android emulator → host), auth interceptors.
- `contexts/` — `AuthContext` (JWT + `queryClient.clear()` on logout), `LanguageContext`.
- `navigation/` — `RootNavigator` → `AuthStack` | `ClientTabs` (4) | `OwnerTabs` (6). Types in `types/navigation.ts`.
- `i18n/` — `en.json` / `fr.json` / `ar.json` (~300+ keys). `compatibilityJSON: 'v3'` required (Hermes lacks `Intl.PluralRules`).
- `theme/` — single source of truth. Primary `#0D9488` (teal), ink `#0F1923`, canvas `#F2F6F6`.

## Conventions

### Backend
- `.scalars().first()` — never `.scalar_one_or_none()` (joins → `MultipleResultsFound`).
- UTC always: `datetime.now(timezone.utc).date()`, never `date.today()`.
- One salon per owner — go through `_get_owner_salon()`.
- Booking states: `confirmed → completed | no_show | cancelled`. No `pending`. Reviews only on `completed`.
- **Never insert `Booking` directly from a router** — go through `create_booking_with_lock()` (it checks bookings AND `salon_closures` for overlap under `SELECT FOR UPDATE`).
- **Slot availability has two sources of truth: `working_hours` AND `salon_closures`.** Any new availability check must consult both — use `utils/time_slots.get_available_slots()` instead of rolling another query.
- **User queries: filter `User.deleted_at.is_(None)`** on any lookup-by-phone/email (login, OTP, password reset, owner-side guest-find). `get_current_user` already filters, so authed-route handlers don't need to. Re-registration of a soft-deleted phone is blocked via `User.original_phone` check in `auth.register`.
- **Salon-listing endpoints must compute `is_open_now` / `closes_at` / `min_service_price`** via `utils/salon_status.compute_is_open_now()`, with `selectinload(Salon.working_hours, Salon.closures)` + one grouped `MIN(price)` query (avoid N+1). The `PremiumSalonCard` consumes these fields.
- New SQLAlchemy models must be imported in `app/models/__init__.py` so Alembic autogenerate sees them.

### Frontend
- TanStack Query for all server data — never `useEffect + fetch`. Key namespaces: `['salon', id]`, `['favorites']`, `['bookings', tab]`, `['owner', 'dashboard'|'salon'|'working-hours'|'closures'|'reviews']`, `['salons', 'recommended'|'popular'|'nearby']`.
- **After owner booking-status mutations** (complete / no-show / cancel) invalidate the client-facing keys too: `['salon', salonId]` and `['salons', 'recommended'|'popular'|'nearby']`. Owner-only invalidation leaves the client home stale for 5 min. `salonId` comes from `queryClient.getQueryData(['owner', 'salon'])`.
- Fonts: Latin = `Outfit-*`, Arabic = `Tajawal-*`. Use `AppText` / `useFontFamily()`. `Tajawal` has no 600 — `SemiBold` maps to `Tajawal_700Bold`.
- `SafeAreaView` from `react-native-safe-area-context` only.
- `useFonts` from `expo-font`, never from `@expo-google-fonts/*`.
- i18n: add keys to **all three** locale files at once.
- Forms: `react-hook-form` + `zod`.
- Navigation: typed helpers from `types/navigation.ts`.

### Reuse shared primitives — don't reinvent
The profile, settings, notifications, and booking flows are deliberately shared across client/owner/admin. Touch one, mirror the other two.

Before writing a screen-local component, check `src/components/premium/`. If you build something any other role could use, put it there and export it via `index.ts`.

| Primitive | Used for |
|---|---|
| `BottomSheetForm` + `Input` + `Button` | **Canonical create/edit/update sheet** across roles. Labels above inputs. Never roll a new `<Modal>` for forms. |
| `ProfileIdentity` + `SettingsGroup` + `SettingsRow` + `LanguagePillRow` | Every profile screen (client/owner/admin share the same skeleton). |
| `HoldToConfirm` | Booking confirm, reschedule, write review, EditLocation save. |
| `DayStrip` + `SlotPicker` + `TimeChip` | Booking, reschedule. |
| `MonthCalendar` | Owner calendar. |
| `PremiumSalonCard` (`hero`/`portrait`/`compact`) | Home, Favorites, Search, Map sheet. |
| `AppointmentTimelineCard` | Client appointments. |
| `SwipeableRow` | Appointments, Notifications, Services. |
| `Segment` | Segmented tabs / filters. |
| `Avatar` | User/salon initial fallback. |
| `FloatingInput` + `PhoneInput` + `OtpBoxes` + `AuthHeader` | Auth + form sheets. |
| `WalkInBookingSheet` | Owner-side walk-in / phone booking from `CalendarScreen` FAB. |
| `PressablePremium` | Replaces every `TouchableOpacity` (haptic + scale). |
| Illustrations in `premium/illustrations/` | All empty states. |
| `ToastProvider` + `useToast` | Cross-role toasts. |
| `PremiumNotificationBell` | Top bars. |

**Confirm dialogs:** use `AlertContext` for short prompts; only escalate to `BottomSheetForm` when the confirm needs an input (password, reason).

**Shared screens:** `NotificationsScreen` deep-links by `user.role`. Owner's `SalonPreviewScreen` is a thin wrapper around client `SalonDetailScreen` with `route.params.preview = true` — visual changes to client detail land in owner preview automatically.

## Design language — make it not feel AI-generated

This is the most important rule. Every default RN screen looks the same; ours must not.

- **Palette:** only `theme/colors.ts`. No `#6366F1` indigo, no purple gradients, no generic AI palettes.
- **Typography:** only sizes from `theme/typography.ts`.
- **Spacing:** 4pt grid via `theme/spacing.ts`. Never hardcode.
- **Touch feedback:** Reanimated press (scale ~0.97, spring) on everything — `PressablePremium` already does this.
- **Motion:** subtle, not showy. Springs > linear. Haptics on key confirmations.
- **Shadows:** subtle, iOS-native feel.
- **Empty states:** always use the illustrations in `premium/illustrations/`. A blank `Text>"No data"</Text>` is a regression.
- **Aesthetic targets:** Linear, Things 3, Arc, Raycast. Editorial typography, calm color, deliberate density.
- **When in doubt:** invoke `impeccable` or `emil-design-eng` and let the skill audit your work before shipping.

## Mauritania-specific
- Currency MRU (integer) — format via `formatCurrency()` (`src/utils/formatters.ts`).
- Phone: 8 digits. Default city: Nouakchott.
- Friday closed by default; open Sat–Thu 9:00–21:00.
- Payment at salon (cash/Bankily/Sedad). No in-app payment.

## Common pitfalls
- Backend `.pyc` cache — restart uvicorn after Python edits if old behavior persists.
- `queryClient.clear()` on logout — prevents data leaking between accounts.
- Don't claim a task is done without running the app via `run` / `verify`. Type-check passing ≠ feature working.
- **Push notifications:** the handler in `App.tsx` uses SDK 52+ keys (`shouldShowBanner` + `shouldShowList`). `shouldShowAlert` is deprecated and silently drops banners. Notifications only render on a dev-client APK — `Constants.appOwnership === 'expo'` short-circuits the handler in Expo Go intentionally.
