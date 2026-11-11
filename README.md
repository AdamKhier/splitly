# Splitly

> “Track the spending. We'll handle the math.”

Splitly is a friendly expense-splitting app built for the **Samsung Galaxy Z Fold 7**, with two distinct layouts: a single-column phone UI on the cover display and a true two-column master–detail UI when the inner display is unfolded.

The project is two parts:

- `backend/` — a real Node.js + TypeScript API: equal/exact/percentage splits, per-person balances, automatic debt **simplification** (fewest transfers), settlements, payment requests, notifications, and an activity timeline. Persists to a JSON file by default and exposes a clean `Store` interface for a future Postgres repo.
- `mobile/` — an Expo / React Native app (Expo SDK 57, RN 0.86) using react-navigation, with adaptive cover/inner layouts driven by a fold hook.

Everything runs locally with no accounts or passwords — it’s a demo-auth build. Expenses and settlements are **recorded, not charged**; no real money moves.

## Quick start

Requires Node ≥ 22.13 (Node 26 lets the backend run TypeScript natively with no build step).

```bash
# 1. Install dependencies (once)
npm install --prefix backend
npm install --prefix mobile

# 2. Start the API  (seeds 7 demo users + 3 demo trips on first run, port 4000)
npm run backend

# 3. In another terminal, start the app
npm run mobile          # Expo dev server
```

Scan the QR code with Expo Go (Z Fold 7), or press `a` for an Android emulator.

### Pointing the app at the API

The app defaults to `http://localhost:4000`. Set a different base URL before starting the dev server:

```bash
# Physical phone — use your computer's LAN IP
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000 npm run mobile

# Android emulator — host is reachable at 10.0.2.2
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000 npm run mobile
```

The active URL is shown in **Settings → Server**. The current backend state is wiped on every fresh boot (`backend/data/` is gitignored and re-seeded from `backend/src/store/seed.ts`).

## Demo accounts

One shared local database, no passwords. Tap past the auth screen, or use **Settings → Demo mode** to switch user on the fly.

| Username | Display name | Notes |
| --- | --- | --- |
| `addz` | Adam | Default on first open |
| `maya` | Maya | |
| `leo` | Leo | Starts the demo owing Andrew money |
| `sam` | Sam | |
| `alex`, `nina`, `priya` | … | Available for you to form trips with |

Seeded trips: **Bali Trip 2026** (4 people, several expenses + one pending settlement), **Rent & Bills** (3 people), **Team Lunch — Sydney** (2 people).

## Fold behaviour

`src/hooks/useFold.ts` tracks a width-based breakpoint (`INNER_THRESHOLD = 604`dp):

- **Cover** — single column. Trip detail shows list + segmented tabs (Expenses / Balances / Settlements / Activity); tapping a row expands its details inline.
- **Inner** — two columns. Trip detail becomes a master–detail split: the list on the left, detail/breakdown panel on the right; Trips screen shows a 2-col grid; modals render as centred dialogs. Navigation state survives folding/unfolding via react-navigation.

## Core features

- **Trips (groups)** — create, rename, describe, pick a currency (16 supported), add/remove members by username, delete.
- **Expenses** — payer picker, split among some-or-all members, equal / exact / percentage splits. Shares use the largest-remainder method so they always sum exactly to the total (money is integer minor units, e.g. cents).
- **Balances** — paid vs. share vs. net per person; **simplified debts on by default** (a DP over zero-sum partition subsets computes the fewest transfers, fallback greedy for >16 people). Toggle itemized view per trip from the header banner or the balances segment.
- **Settlements** — record who paid whom (cash/bank/PayID/card/other), mark as paid, delete. A completed settlement immediately updates everyone’s balances.
- **Requests & notifications** — ask anyone in a trip for money; they get an in-app notification; the Requests tab groups “to me” vs. “sent”.
- **Activity timeline** — every expense, settlement, request, and member change, newest first.

## Architecture

```
backend/src/
  engine/          pure functions, fully unit-tested (largest-remainder splits,
                   balance computation, debt simplification w/ DP + greedy fallback)
  store/           Store interface, JSON-file implementation (atomic writes), seed data
  api/             Express app: routes/auth/users/trips/expenses/settlements,
                   Zod validation, HMAC demo-auth, consistent ApiError JSON
  index.ts         bootstrap: load persisted DB, seed if empty, listen on :4000

backend/tests/     15 engine + balance tests  →  npm run backend:test

mobile/src/
  api/             typed DTOs + fetch client (single ApiClient class)
  auth/            session context, AsyncStorage-persisted demo session
  theme/           design tokens (colors/radii/spacing/shadows/currencies)
  hooks/           useFold (display mode), useData (fetch + reload state)
  nav/             root stack + bottom tabs, typed param lists
  components/      design-system components (Text, Button, Card, Avatar,
                   Chip, Segmented, Field, SheetModal, Money, EmptyState, …)
  screens/         Auth, Trips, TripDetail, ExpenseForm, Requests, Settings
```

## Seams for the future

- **Auth** — demo tokens are HMAC-signed `{ uid, exp }`; swap `POST /api/auth/demo` for a real flow without touching the rest of the API.
- **Persistence** — implement the `Store` interface (`backend/src/store/store.ts`) with Postgres and the routes won’t change.
- **Offline** — the DTOs are already shared shapes; add a local cache/queue later.
- **Splitly CLI smoke tests** — `bash` + `jq` against `:4000` were used to verify balances, settlement math, and notifications end to end.

## Tests & verification

```bash
npm run backend:test     # 15/15 engine + balance tests
npx tsc --noEmit         # backend (strict) and mobile each typecheck clean
npx expo export --platform android   # Metro bundle builds (verified 2.4MB .hbc)
```