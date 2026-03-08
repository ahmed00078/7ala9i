# AGENTS.md — 7ala9i (حلاقي)

Guide for AI agents working on this codebase. Read this before making any changes.

---

## Project Overview

**7ala9i** is a barbershop booking app for Mauritania. It has two user roles:
- **Client** — browses salons, books appointments, writes reviews, manages favorites
- **Owner** — manages their salon's services, working hours, and views appointments/stats

**Stack:**
- **Frontend**: React Native (Expo SDK 52), TypeScript, React Navigation, TanStack Query, i18next
- **Backend**: FastAPI (Python 3.12), SQLAlchemy (async), PostgreSQL (hosted on Railway), Alembic
- **Environment**: Windows host + WSL for Linux tools

---

## Repository Structure

```
7ala9i/
├── AGENTS.md               ← this file
├── commands.md             ← quick-start commands & seed accounts
├── docker-compose.yml      ← PostgreSQL (local dev only; Railway used in prod)
├── .env.example
├── backend/
│   ├── app/
│   │   ├── main.py         ← FastAPI app, router registration
│   │   ├── config.py       ← Pydantic settings (reads .env)
│   │   ├── database.py     ← async SQLAlchemy engine + session
│   │   ├── api/
│   │   │   ├── deps.py     ← get_current_user, get_db dependencies
│   │   │   └── v1/
│   │   │       ├── auth.py       ← /auth/register, /auth/login, /auth/refresh
│   │   │       ├── salons.py     ← GET /salons, GET /salons/{id}, availability, reviews
│   │   │       ├── bookings.py   ← CRUD bookings, cancel, reschedule
│   │   │       ├── reviews.py    ← POST /reviews (completed bookings only)
│   │   │       ├── favorites.py  ← GET/POST/DELETE /favorites
│   │   │       ├── users.py      ← GET/PUT /users/me
│   │   │       ├── owner.py      ← all /owner/* routes (auth-gated, owner role only)
│   │   │       └── admin.py      ← POST /admin/owners (create owner account)
│   │   ├── models/         ← SQLAlchemy ORM models
│   │   ├── schemas/        ← Pydantic request/response schemas
│   │   ├── services/       ← booking_service.py, notification_service.py
│   │   └── utils/          ← security.py (JWT), time_slots.py
│   ├── alembic/            ← database migrations
│   ├── seed.py             ← seeds DB with sample data (run once)
│   ├── requirements.txt
│   └── venv/               ← Python virtualenv (Windows path, run from Windows)
└── frontend/
    ├── App.tsx             ← entry point, loads fonts, wraps providers
    ├── index.ts
    ├── app.json            ← Expo config
    ├── src/
    │   ├── api/            ← API client functions (axios-based)
    │   │   ├── client.ts   ← axios instance, base URL, auth interceptors
    │   │   ├── auth.ts
    │   │   ├── salons.ts
    │   │   ├── bookings.ts
    │   │   ├── reviews.ts
    │   │   ├── favorites.ts
    │   │   ├── owner.ts
    │   │   └── users.ts
    │   ├── contexts/
    │   │   ├── AuthContext.tsx    ← user, token, login/logout; clears QueryClient on logout
    │   │   └── LanguageContext.tsx ← language state, changeLanguage()
    │   ├── hooks/
    │   │   ├── useFontFamily.ts  ← returns Outfit or Tajawal fonts based on language
    │   │   └── useLocation.ts
    │   ├── navigation/
    │   │   ├── RootNavigator.tsx        ← Auth / ClientMain / OwnerMain
    │   │   ├── AuthStack.tsx
    │   │   ├── ClientTabs.tsx           ← Home, Appointments, Favorites, Profile tabs
    │   │   └── OwnerTabs.tsx            ← Dashboard, Calendar, Services, Hours, Preview, Profile tabs
    │   ├── screens/
    │   │   ├── auth/                    ← WelcomeScreen, LoginScreen, RegisterScreen
    │   │   ├── client/                  ← HomeScreen, SearchScreen, SalonDetailScreen,
    │   │   │                               BookingFlowScreen, BookingConfirmScreen,
    │   │   │                               AppointmentsScreen, FavoritesScreen,
    │   │   │                               ProfileScreen, WriteReviewScreen, MapSearchScreen
    │   │   └── owner/                   ← DashboardScreen, CalendarScreen,
    │   │                                   ManageServicesScreen, WorkingHoursScreen,
    │   │                                   SalonPreviewScreen, OwnerProfileScreen
    │   ├── components/
    │   │   ├── ui/
    │   │   │   ├── AppText.tsx    ← language-aware Text (auto Outfit/Tajawal)
    │   │   │   ├── Button.tsx
    │   │   │   ├── Card.tsx
    │   │   │   ├── Input.tsx
    │   │   │   ├── StarRating.tsx
    │   │   │   ├── EmptyState.tsx
    │   │   │   └── LoadingScreen.tsx
    │   │   ├── salon/             ← SalonCard, PhotoCarousel, ServiceCategory
    │   │   ├── booking/           ← AppointmentCard, TimeSlotPicker
    │   │   └── owner/             ← StatCard, DaySchedule
    │   ├── theme/
    │   │   ├── colors.ts          ← single source of truth for colors
    │   │   ├── typography.ts      ← fontFamily + getFontFamily(language)
    │   │   └── spacing.ts
    │   ├── i18n/
    │   │   ├── index.ts           ← i18next setup, compatibilityJSON: 'v3'
    │   │   ├── en.json            ← English translations
    │   │   ├── fr.json            ← French translations
    │   │   └── ar.json            ← Arabic translations
    │   ├── types/
    │   │   ├── navigation.ts      ← all stack/tab param lists + screen props helpers
    │   │   ├── models.ts          ← shared TypeScript types
    │   │   └── api.ts
    │   └── utils/
    │       ├── formatters.ts      ← formatDate, formatTime, formatCurrency, getDayName
    │       ├── storage.ts
    │       └── validators.ts
    └── package.json
```

---

## Running the Project

### Backend (Windows — run in Windows terminal, NOT WSL)
```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
# Runs on http://localhost:8000
# API docs: http://localhost:8000/docs
```

**After model changes**, create and apply a migration:
```powershell
alembic revision --autogenerate -m "description"
alembic upgrade head
```

**To re-seed the database:**
```powershell
python seed.py
```

### Frontend (WSL or Windows)
```bash
cd frontend
npx expo start
# Press 'a' for Android emulator
```

---

## Seed Accounts (for testing)

| Role   | Email                  | Password   |
|--------|------------------------|------------|
| Admin  | admin@halagi.mr        | admin123   |
| Owner  | ahmed@halagi.mr        | owner123   |
| Owner  | moussa@halagi.mr       | owner123   |
| Owner  | ibrahim@halagi.mr      | owner123   |
| Client | client@halagi.mr       | client123  |

---

## Backend Conventions

### Query pattern — always use `.scalars().first()` not `.scalar_one_or_none()`
Using `.scalar_one_or_none()` crashes with `MultipleResultsFound` when joins produce multiple rows.
```python
# CORRECT
result = await db.execute(select(Salon).where(Salon.owner_id == user_id))
salon = result.scalars().first()

# WRONG — crashes if joins return multiple rows
salon = result.scalar_one_or_none()
```

### Dates — always use UTC
```python
from datetime import datetime, timezone
today = datetime.now(timezone.utc).date()  # NOT date.today()
```

### Owner endpoints
All `/owner/*` routes are gated by `get_current_user` + role check inside `_get_owner_salon()`.
A user must have `role = UserRole.owner` and an associated salon.

### Booking statuses
`pending → confirmed → completed | no_show | cancelled`
- Reviews can only be written for `completed` bookings.
- Owner can update status via `PATCH /owner/appointments/{id}/status`.

### API base URL
Defined in `frontend/src/api/client.ts`. Points to `http://10.0.2.2:8000/api/v1` for Android emulator (maps to localhost on host machine).

---

## Frontend Conventions

### Data fetching — TanStack Query
All server data uses `useQuery` / `useMutation`. Never fetch in `useEffect`.
```typescript
const { data, isLoading } = useQuery({
  queryKey: ['salon', salonId],
  queryFn: () => salonsApi.getDetail(salonId),
});
```

Query key namespaces:
- `['salon', id]` — salon detail
- `['favorites']` — user's favorites list
- `['bookings', tab]` — client bookings
- `['owner', 'dashboard']` — owner dashboard stats
- `['owner', 'salon']` — owner's salon
- `['owner', 'working-hours']` — owner working hours

**On logout**, call `queryClient.clear()` (already done in `AuthContext.tsx`) to prevent data leakage between accounts.

### Fonts
- **Latin (en/fr)**: `Outfit-Regular`, `Outfit-Medium`, `Outfit-SemiBold`, `Outfit-Bold`
- **Arabic**: `Tajawal-Regular`, `Tajawal-Medium`, `Tajawal-SemiBold`, `Tajawal-Bold`
- `useFontFamily()` hook returns the correct set for the current language.
- `AppText` component auto-switches fonts based on language.
- Static `StyleSheet` strings use `Outfit-*` (Latin default); for dynamic font switching use `AppText` or `useFontFamily()`.

### Colors (from `src/theme/colors.ts`)
```typescript
accent: '#0D9488'        // primary teal
accentLight: '#CCFBF1'   // teal background tints
accentDark: '#0F766E'    // pressed/dark teal
black: '#0F1923'         // main text (dark navy)
background: '#F2F6F6'    // screen background
white: '#FFFFFF'
gray: '#94A3B8'          // placeholder, muted
grayDark: '#64748B'      // secondary text
border: '#DDE4E3'        // card borders
error: '#EF4444'         // red / destructive
success: '#22C55E'
warning: '#F59E0B'
star: '#FBBF24'
```

### Navigation
- Root → Auth stack OR ClientMain (tabs) OR OwnerMain (tabs)
- Navigation types are in `src/types/navigation.ts` — use the typed `*ScreenProps` helpers
- Screen props pattern: `function MyScreen({ navigation, route }: ClientHomeScreenProps<'MyScreen'>)`

### Internationalization (i18n)
Three languages: `en`, `fr`, `ar`. Keys in `src/i18n/{lang}.json`.
- Use `compatibilityJSON: 'v3'` (already set) — Android Hermes has no `Intl.PluralRules`
- Always add new keys to **all three** language files simultaneously
- RTL is handled automatically by React Native for Arabic

### SafeAreaView
Always import from `react-native-safe-area-context`, never from `react-native`:
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';  // ✓
import { SafeAreaView } from 'react-native';                     // ✗ deprecated
```

---

## Key Design Decisions

1. **One salon per owner** — the backend enforces this; `_get_owner_salon()` fetches the unique salon by `owner_id`.
2. **Favorites toggle** — `SalonDetailScreen` fetches the `['favorites']` list and checks `isFavorited` locally; calls `add` or `remove` accordingly.
3. **Review flow** — only bookings with status `completed` can be reviewed. The "Write a Review" button appears in `AppointmentsScreen` on the Past tab below completed bookings.
4. **Owner stats use UTC** — dashboard counts use `datetime.now(timezone.utc).date()` to avoid timezone bugs.
5. **Currency** — Mauritanian Ouguiya (MRU), displayed with `formatCurrency()`.
6. **Profile screens** — both client and owner profiles use a teal header with avatar initials, sectioned card layout (iOS Settings style), and a red logout row.

---

## Common Pitfalls

- **Backend `.pyc` cache** — after changing Python files, if the old behaviour persists, restart uvicorn. On Windows, WSL cannot delete locked `.pyc` files.
- **QueryClient cache between users** — always call `queryClient.clear()` on logout.
- **Tajawal has no 600SemiBold** — `Tajawal-SemiBold` is mapped to `Tajawal_700Bold` in `App.tsx`.
- **`useFonts` import** — must come from `expo-font`, not from `@expo-google-fonts/*` packages.
- **Multiple results from SQLAlchemy** — use `.scalars().first()`, never `.scalar_one_or_none()` on queries that may join multiple rows.
- **Date-only queries** — always compare against UTC date, not server local date.
