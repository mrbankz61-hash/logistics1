# [AGENCY NAME]: courier website, tracking and dispatch dashboard

A full-stack web app for a small courier agency that runs dispatch by phone.
Drivers and customers call in, and staff record each update in the dashboard.
There is no GPS: customers see a map with the route, an **estimated** current
position computed from the latest confirmed update, the ETA, and a timeline.

- **Public site:** home, services, about, contact (form, click-to-call, WhatsApp, email) and shipment tracking (`/track`, `/track/[trackingNumber]`).
- **Dashboard** (`/admin`, staff only):
  - shipments list with search, filters and ETA sort
  - create shipment with address autocomplete and road routing
  - per-shipment control panel: start, pause, resume, set position on the map, adjust ETA, change status, re-route, log update
  - activity log (admins)
  - staff management (admins)
  - contact-form inbox

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Supabase (Postgres, Auth, Realtime) · Leaflet + OpenStreetMap · OpenRouteService · zod · Vitest. Deploys to Vercel.

---

## Setup

### 1. Prerequisites

- Node.js 20.9 or newer
- A Supabase project (the free plan is enough to start): <https://supabase.com/dashboard>
- An OpenRouteService API key (free): <https://openrouteservice.org/dev/#/signup>

### 2. Create the database

Run the migration in [`supabase/migrations/20261008000000_init.sql`](supabase/migrations/20261008000000_init.sql) using either:

- **The dashboard:** open **SQL Editor**, paste the whole file and click **Run**, or
- **The Supabase CLI:**

  ```bash
  npx supabase init          # only if supabase/config.toml doesn't exist yet
  npx supabase link --project-ref YOUR_PROJECT_REF
  npx supabase db push
  ```

The migration creates the tables, Row Level Security, the `commit_shipment` and `get_public_tracking` functions and the activity-log triggers.

### 3. Supabase settings

1. **Authentication → Sign In / Providers:** keep **Email** enabled and turn **off** "Allow new users to sign up". Staff are created by admins; signing up gives no access anyway, because access requires a row in `staff`.
2. **Authentication → URL Configuration:**
   - Set **Site URL** to your production URL.
   - Add **Redirect URLs** `http://localhost:3000/**` and `https://YOUR-DOMAIN/**`.
3. **Realtime → Settings:** keep public channels allowed (the default). Tracking pages listen on a public broadcast channel named after the tracking number.
4. **Email (optional):**
   - **Staff Invite / Reset link** buttons give you a link to send yourself, so they work with no email setup.
   - **Forgot password?** on the login page uses Supabase's emails. Supabase's built-in sender only delivers to your project team's addresses, so configure custom SMTP under **Authentication → Emails** if staff should reset passwords themselves.

### 4. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API (project URL) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys → publishable key (`sb_publishable_…`). The legacy `anon` key also works as `NEXT_PUBLIC_SUPABASE_ANON_KEY`. |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys → secret key (`sb_secret_…`). **Server only, never expose it.** The legacy `service_role` key also works as `SUPABASE_SERVICE_ROLE_KEY`. |
| `ORS_API_KEY` | OpenRouteService dashboard |
| `ORS_GEOCODE_COUNTRY` | Optional. ISO country code(s) to focus address search, e.g. `NG` or `GB,IE` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally; your public URL in production |
| `NEXT_PUBLIC_MAP_TILE_URL` | Optional tile server URL (see [Maps](#maps)) |

### 5. Install, create the first admin, run

```bash
npm install
npm run create-admin -- --email you@agency.com --password "a-long-password" --name "Your Name"
npm run seed      # optional: 3 sample shipments (pending, in transit, paused)
npm run dev
```

Open <http://localhost:3000/login>. The seed script prints tracking links such as `/track/XXX-SAMPLE02`.

`create-admin` also works for an existing account; it (re)grants the role and resets the password if one is given. Use `--role dispatcher` for a dispatcher. After the first admin exists, invite everyone else from **Dashboard → Staff**.

---

## Deploying to Vercel

1. Push the repo and import it in Vercel. The framework preset is detected automatically.
2. Add every variable from `.env.example` under **Settings → Environment Variables**. Set `NEXT_PUBLIC_SITE_URL` to the production URL.
3. Deploy, then add the production domain to Supabase **Redirect URLs** (step 3.2).

---

## Day-to-day use

- **Create a shipment:** choose pickup and delivery from the address search, then check the route preview. The planned hours are prefilled from the routing estimate; adjust them for stops and loading. Saving fetches the route and generates a unique tracking number (`XXX-` plus 8 characters, without the look-alikes I, O, 0 and 1).
- **Send the tracking link:** on the shipment page, use **Copy link** or **Send tracking link** (WhatsApp to the receiver).
- **Every dispatch action** asks for:
  - the source (Driver call / Dispatch / Customer call / Office)
  - a location label
  - an optional note for the customer
  - an optional internal note
  - whether the update appears on the customer's timeline

  Each action creates a timeline event and an activity-log entry.
- **Set position:** click the map; the point snaps to the nearest spot on the route. Enter the hours remaining and movement continues from there.
- **Re-route:** pick a new destination and/or a waypoint. The route is fetched again from the current estimated position, and the part already travelled is kept so the marker doesn't jump.
- **Staff:**
  - **Invite** creates the account and gives you a one-time link. It signs them in and asks them to choose a password.
  - **Role changes and disabling** take effect on the person's next request. Disabling also bans the Supabase user, so they can't sign in again.
  - You can't change your own role or disable yourself.

---

## How it works

### Movement model (`lib/movement.ts`)

Positions are computed, never ticked by a server. Each shipment stores:

```ts
movement: { state: "not_started" | "moving" | "paused" | "arrived", anchorFraction, anchorTime, remainingMs }
```

These are the `movement_state`, `anchor_fraction`, `anchor_time` (timestamptz) and `remaining_ms` columns.

- **Fraction while moving:** `anchorFraction + (1 - anchorFraction) * clamp((now - anchorTime) / remainingMs, 0, 1)`
- **Pause:** saves the current fraction and the time left. **Resume:** restarts the clock with that time.
- **Set position / Adjust ETA:** re-anchor at `now`.
- **ETA:** `anchorTime + remainingMs` while moving.
- **Fraction to coordinates:** binary search over the stored cumulative distances, then linear interpolation.
- **Arrival:** when the fraction reaches 1, viewers see "Arriving now". The stored state becomes `arrived` on the next staff action.

The same pure module runs in the browser (the marker glides along the road every ~2 s), on the public page and in Server Actions. Clients correct for device clock drift with `/api/time`. Dispatch rules (which action is allowed when, and what it does to status and movement) live in the pure reducer `lib/shipments/reducer.ts`.

### Data model

| Table | Contents | Browser access (publishable key) |
| --- | --- | --- |
| `shipments` | Parties, package, driver, route (simplified to ≤ 500 points + cumulative distances), movement, `version` | Staff only (RLS) |
| `shipment_events` | Timeline: source, location label, public note, internal note, visibility, who | Staff only (RLS) |
| `public_tracking` | Sanitised projection (`lib/shipments/projection.ts`): status, movement, route, origin/destination **labels**, customer-visible timeline, ETA. No phones, emails, addresses, driver or internal notes. | **No direct access.** Only `get_public_tracking(number)`, which returns one row by exact tracking number, so the table can't be listed. |
| `activity_log` | Who / what / when / before / after for every staff action | Admins only (RLS); append-only |
| `staff` | Role (`admin` / `dispatcher`) and disabled flag: the source of truth for access | Staff only (RLS) |
| `contact_messages` | Contact form submissions | Staff only (RLS) |

### Security

- **Auth:** staff sign in with Supabase Auth (email + password) through a Server Action. The session lives in httpOnly cookies managed by `@supabase/ssr`; no auth tokens are readable by page scripts.
- **Route protection:**
  - `proxy.ts` refreshes the session and sends signed-out visitors to `/login`.
  - The admin layout, every admin page, every Server Action and every Route Handler verifies the JWT (`getClaims`) and looks the user up in `staff` (role, disabled).
  - Admin-only pages and actions check the role again.
- **Data access:** the server uses the secret key, only after that check, and validates every input with zod.
- **Atomic writes:** every shipment change calls `commit_shipment()`. In one database transaction it writes the shipment, its new timeline events, the public projection and the activity-log entry.
- **Stale edits:** the commit checks the shipment's `version`. If two dispatchers act at once, the second gets a "someone else updated this" message instead of overwriting.
- **RLS:** enabled on every table as a second line of defence. Browsers can't write anything, and `commit_shipment()` can only be executed with the secret key.
- **Activity log:** triggers reject `UPDATE`, `DELETE` and `TRUNCATE`, even from the secret key or the table owner.
- **API key:** the ORS key stays on the server. Geocoding goes through the staff-only `/api/geocode`.

### Live updates

After each commit the server broadcasts `updated` on the Realtime channel `tracking:<number>`. The public tracking page and the dashboard's shipment page refetch when they hear it. As a safety net they also re-check every 60 seconds and whenever the tab becomes visible.

---

## Branding and content

| What | Where |
| --- | --- |
| Name, phone, WhatsApp, email, address, hours, tracking prefix | `lib/brand.ts` |
| Colours: `brand` (electric blue), `accent` (signal orange), `ink` (dark sections) | `app/globals.css` |
| Fonts: Exo 2 (display), Inter (body), JetBrains Mono (labels) | `app/layout.tsx` |
| Wordmark and icon | `components/logo.tsx`, `app/icon.svg` |
| Services, showcase headlines, steps, "why us", keyword strip | `lib/content.ts` |
| Service photos: set `image` on a service (e.g. `/images/same-day.jpg` in `public/`); otherwise the built-in illustration is used | `lib/content.ts` |
| Globe hubs (the cities planes fly between) and starting longitude | `GLOBE_HUBS`, `GLOBE_START_LNG` in `lib/content.ts` |
| Page copy | `app/(site)/*` |

All marketing copy is placeholder text. Review every claim (services, handling, hours) before launch.

### Hero globe

`components/site/globe.tsx` draws the spinning globe on a `<canvas>` with no map library:
- **Land:** about 3,000 precomputed land dots (`components/site/globe-dots.ts`).
- **Flights:** planes fly great-circle arcs between the hubs. They are small on the runway, larger at cruise altitude, and show a ripple at take-off and landing.
- **Accessibility and performance:** the animation stops when off-screen. It is static for visitors who prefer reduced motion and has a pause button.
- **Regenerating the dots:** run `npm run generate:globe`. Land outlines come from Natural Earth (public domain) via `world-atlas`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Unit tests, plus SQL tests that run the migration in PGlite (Postgres in WASM) |
| `npm run typecheck` / `lint` | TypeScript / ESLint |
| `npm run create-admin -- --email … --password … --name … [--role dispatcher]` | Create or promote a staff account |
| `npm run generate:globe` | Rebuild the globe's land dots (only needed to change their density) |
| `npm run seed [-- --dry-run]` | Load 3 sample shipments (straight-line routes if `ORS_API_KEY` is missing). Edit `SAMPLES` in `scripts/seed.ts` for your area. |

### Tests

`npm test` covers:

- **Movement model:** interpolation, pause/resume, set position, ETA, binary search, snapping, splitting
- **Route simplification**
- **Tracking numbers**
- **Dispatch reducer:** every action and the invalid transitions
- **Re-route splicing**
- **Public projection:** asserts that no phone numbers, emails, addresses, driver details or internal notes reach `public_tracking`
- **Database (`lib/db/schema.test.ts`):** applies the real migration to an in-memory Postgres and checks:
  - commits round-trip through the app's encoders
  - stale versions are rejected and roll back
  - tracking numbers are unique
  - browsers can't call `commit_shipment`, list tables or write
  - staff, admin, outsider and disabled-user RLS behave as intended
  - the activity log can't be changed or deleted

---

## Maps

Tiles come from the public OpenStreetMap server by default. That is fine for light use, but OSM's [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) asks heavier users to use a provider. Set `NEXT_PUBLIC_MAP_TILE_URL` to a provider URL (for example MapTiler or Stadia Maps) if traffic grows. OpenRouteService's free plan has daily quotas for directions and geocoding.

## Known limits

- The shipments list loads the newest 500 shipments and filters in the browser. Add server-side pagination if you outgrow that.
- The contact form uses a honeypot but no rate limiting. Add Vercel Firewall rules or a CAPTCHA if spam appears.
- The SQL tests stub Supabase's `auth` schema and roles. Policies that depend on hosted-only behaviour (Realtime authorisation, Auth rate limits) are only exercised on a real project.
