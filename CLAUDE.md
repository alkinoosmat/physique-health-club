# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build
npx tsc --noEmit  # Type-check without emitting (run before every commit)
npm run lint      # ESLint
```

There are no tests. Always run `npx tsc --noEmit` before committing.

## Architecture

Next.js 16 App Router, React 19, Tailwind CSS v4, Supabase (postgres + RLS), deployed on Vercel.

**Two user surfaces:**
- `/` — Public booking page (clients book/cancel sessions)
- `/admin` — Password-protected admin panel (calendar + customers)

### Supabase

All DB access goes through the lazy proxy in `lib/supabase.ts`. Never call `createClient` directly — use the `supabase` export or `getSupabase()`. This avoids build-time env var errors.

```ts
// ✅ correct
import { supabase } from '@/lib/supabase'
// ❌ wrong — breaks at build time
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(...)
```

**Tables:**
- `reservations` — bookings with `date` (ISO string), `start_time`/`end_time` (HH:MM:SS), `customer_id` (nullable FK), `no_show` (boolean)
- `customers` — created/linked when a booking is made (by phone match)

RLS is open (public anon key) — all four policies (SELECT/INSERT/UPDATE/DELETE) are enabled on both tables. `supabase-schema.sql` is the source of truth; run it manually in Supabase SQL Editor when schema changes.

**Customer linking logic** (both `BookingModal` and admin `handleBook`): look up existing customer by phone → link if found, create new if not.

### Admin auth

`/api/admin-auth` checks `POST { password }` against `ADMIN_PASSWORD` env var. On success, client stores `admin_unlocked=1` in `sessionStorage`. No JWTs, no cookies.

### Key files

| File | Purpose |
|---|---|
| `lib/supabase.ts` | Supabase client + `Reservation` / `Customer` types |
| `lib/utils.ts` | `TIME_SLOTS`, date/time helpers, `isSlotPast`, `isSunday` |
| `app/page.tsx` | Public booking page — fetches slot counts, opens `BookingModal` / `CancelModal` |
| `app/admin/page.tsx` | Admin page — fetches all reservations + customers, owns all mutation handlers (`handleBook`, `handleEdit`, `handleDelete`, `handleToggleNoShow`, `handleDeleteCustomer`) |
| `components/AdminCalendar.tsx` | Calendar UI (day + week views). Edit modal lives at the root of this component. `editingId` is the single source of truth for which reservation is being edited. |
| `components/CustomersTab.tsx` | Customer list with search, expandable booking history (future/today/past), no-show toggle, delete |
| `components/BookingModal.tsx` | Public booking form — creates/links customer on submit |

### Important conventions

- **Date format**: always `YYYY-MM-DD` ISO strings (use `toLocalISODate()` from `lib/utils.ts`, never `toISOString()` which gives UTC)
- **Time format**: DB stores `HH:MM:SS`, UI uses `HH:MM` slices — always `.slice(0, 5)` when displaying
- **Sundays**: gym is closed — `DatePicker` skips them, `isSunday()` helper available
- **Past slots**: `isSlotPast()` disables slots on the public page
- **Max per slot**: 7 (`MAX_PER_SLOT` constant in both `page.tsx` and `AdminCalendar.tsx`)
- **Greek locale**: all user-facing text and `toLocaleDateString` calls use `el-GR`
- **No-show state**: amber color + strikethrough name across calendar and customer tab
- **Mobile zoom**: viewport has `maximum-scale=1, user-scalable=no` (set in `app/layout.tsx` via `Viewport` export) to prevent iOS input zoom
