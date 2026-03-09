# Copilot Instructions — 7ala9i (حلاقي)

A barbershop/salon booking app for Mauritania. Two-sided marketplace: clients book appointments; salon owners manage their business. Full stack: FastAPI backend + React Native (Expo) frontend.

---

## Running the Project

### Backend (Windows PowerShell — NOT WSL)
```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
# http://localhost:8000  |  Swagger: http://localhost:8000/docs
```

### Database Migrations
```powershell
alembic revision --autogenerate -m "description"
alembic upgrade head
python seed.py   # re-seed sample data
```

### Frontend (WSL or Windows)
```bash
cd frontend
npx expo start
# Press 'a' for Android emulator
```

---

## Architecture

### Backend: `backend/app/`
```
main.py          ← FastAPI app + router registration
config.py        ← Pydantic BaseSettings (reads backend/.env)
database.py      ← async SQLAlchemy engine, AsyncSession factory
api/deps.py      ← get_db(), get_current_user(), require_role()
api/v1/          ← one file per domain: auth, salons, bookings,
                    reviews, favorites, users, owner, admin
models/          ← SQLAlchemy ORM models
schemas/         ← Pydantic request/response schemas
services/        ← booking_service.py, notification_service.py
utils/           ← security.py (JWT/bcrypt), time_slots.py
alembic/         ← migrations
```

**All database access is fully async** (`AsyncSession`, `create_async_engine`, `await db.execute(...)`).

### Frontend: `frontend/src/`
```
api/             ← axios functions per domain (client.ts = base instance)
contexts/        ← AuthContext (user/tokens), LanguageContext
navigation/      ← RootNavigator → AuthStack | ClientTabs | OwnerTabs
screens/         ← auth/, client/, owner/
components/      ← ui/, salon/, booking/, owner/
theme/           ← colors.ts, typography.ts, spacing.ts
i18n/            ← index.ts + en.json, fr.json, ar.json
types/           ← navigation.ts (all typed params), models.ts, api.ts
hooks/           ← useFontFamily.ts, useLocation.ts
```

---

## Auth & Roles

- **JWT only** — HS256, two tokens returned on login/register:
  - `access_token` (30 min default) → `Authorization: Bearer <token>`
  - `refresh_token` (30 days) → sent in body to `POST /auth/refresh`
- Three roles: `client` (default), `owner`, `admin`
- Owner routes at `/api/v1/owner/*` require `role = UserRole.owner`; `_get_owner_salon()` enforces this and fetches the owner's unique salon.

---

## Key Conventions

### Backend

**Always use `.scalars().first()`, never `.scalar_one_or_none()`**
Joins that return multiple rows cause `MultipleResultsFound` with the latter:
```python
result = await db.execute(select(Salon).where(...))
salon = result.scalars().first()   # ✓
```

**Always use UTC for dates:**
```python
from datetime import datetime, timezone
today = datetime.now(timezone.utc).date()   # never date.today()
```

**Dependency injection pattern:**
```python
@router.get("/")
async def endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
```

**Schemas follow Create/Update/Response pattern** — no shared Base; `model_config = {"from_attributes": True}` on Response schemas; use `model_validate(orm_obj)` to convert ORM → DTO.

**Booking status flow:** `confirmed → completed | no_show | cancelled`. Reviews only allowed on `completed` bookings. Use `SELECT ... WITH FOR UPDATE` lock in `create_booking_with_lock()` to prevent double-booking.

### Frontend

**All server data via TanStack Query** — never `useEffect` + `fetch`:
```typescript
const { data } = useQuery({
  queryKey: ['salon', salonId],
  queryFn: () => salonsApi.getDetail(salonId),
});
```

**Query key namespaces:**
- `['salon', id]`, `['favorites']`, `['bookings', tab]`
- `['owner', 'dashboard']`, `['owner', 'salon']`, `['owner', 'working-hours']`

**On logout** — `queryClient.clear()` is called in `AuthContext.tsx`; don't skip this.

**Font system:** Latin (en/fr) = `Outfit-*`, Arabic = `Tajawal-*`. Use `AppText` component for any text (auto-switches font). Use `useFontFamily()` hook when building custom styled text. Static `StyleSheet` strings default to `Outfit-*` — only acceptable for Latin-only UI text.
- `Tajawal` has no 600 weight; `Tajawal-SemiBold` maps to `Tajawal_700Bold` in `App.tsx`.

**SafeAreaView — always from `react-native-safe-area-context`:**
```typescript
import { SafeAreaView } from 'react-native-safe-area-context';  // ✓
import { SafeAreaView } from 'react-native';                     // ✗
```

**i18n — always add keys to all three files** (`en.json`, `fr.json`, `ar.json`) simultaneously. `compatibilityJSON: 'v3'` is required (Android Hermes has no `Intl.PluralRules`).

**Navigation types** — all screen prop types are in `src/types/navigation.ts`:
```typescript
function MyScreen({ navigation, route }: ClientStackScreenProps<'MyScreen'>) {}
```

**API base URL** is `http://10.0.2.2:8000/api/v1` in `src/api/client.ts` (Android emulator maps to host's localhost).

---

## Key Design Decisions

- **One salon per owner** — enforced in backend; `_get_owner_salon()` fetches by `owner_id`.
- **Time slots** are 30-minute intervals; availability = generated slots minus confirmed bookings (overlap check), filtered to future times for today.
- **Currency** — Mauritanian Ouguiya (MRU), use `formatCurrency()` from `src/utils/formatters.ts`.
- **Colors** — navy headers `#1C2434`, primary accent `#0D9488` (teal), background `#F1F5F9`. Full palette (including `successLight`, `errorLight`, `warningLight`, `infoLight`, `purpleLight` for badge/icon boxes) in `src/theme/colors.ts`.
- **Design language** — TailAdmin-inspired: dark navy (`colors.navy`) for screen hero headers, pill-style tabs (filled active state), left-border accent on appointment cards, floating rating badges on salon images, icon boxes in stat cards.
- **Salon photos** are stored as URLs in `SalonPhoto` model; cover photo URL is denormalized onto the `Salon` model as `cover_photo_url`.

---

## Seed Accounts

| Role   | Email               | Password  |
|--------|---------------------|-----------|
| Admin  | admin@halagi.mr     | admin123  |
| Owner  | ahmed@halagi.mr     | owner123  |
| Client | client@halagi.mr    | client123 |
