# Pick Up

**Everything You Need, Delivered Fast** · আপনার প্রয়োজন, দ্রুত ডেলিভারি

Pick Up is a Bangladesh-focused, multi-vendor marketplace for groceries, everyday essentials, household products, personal care, and restaurant food. It currently operates only in **Khagrachari Sadar**, but every part of the location system — divisions, districts, upazilas, towns, neighbourhoods, delivery zones, fees, and coverage — is stored in the database and managed from the admin dashboard, so expansion to new areas never requires a code change.

This is a demonstration/portfolio build: the architecture, database schema, and every workflow are production-shaped, but real merchant/payment/maps credentials, a completed legal review of the age-restricted product module, and a security audit are still required before taking real orders or real money. See [Known limitations](#known-limitations) below.

---

## Table of contents

- [Technology stack](#technology-stack)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Demo accounts](#demo-accounts)
- [Testing](#testing)
- [Production build](#production-build)
- [Payment integration](#payment-integration)
- [Google Maps setup](#google-maps-setup)
- [Object storage](#object-storage)
- [Background jobs](#background-jobs)
- [Replacing mock services with live ones](#replacing-mock-services-with-live-ones)
- [Deployment](#deployment)
  - [Hostinger Node.js Web App](#hostinger-nodejs-web-app-hosting)
  - [Hostinger Cloud hosting](#hostinger-cloud-hosting)
  - [Hostinger VPS](#hostinger-vps)
  - [GitHub-based deployment](#github-based-deployment)
  - [ZIP-file deployment](#zip-file-deployment)
  - [Docker](#docker-optional)
- [Known limitations](#known-limitations)
- [Recommended next steps](#recommended-next-steps)

---

## Technology stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript, React 19 |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL, accessed via Prisma ORM 7 with the `@prisma/adapter-pg` driver adapter |
| Auth | Custom credentials auth — bcrypt password hashing, signed JWT session cookies (`jose`), no third-party auth vendor |
| Validation | Zod |
| Forms/mutations | Native `<form action={...}>` + React Server Actions throughout (no client form library) |
| Testing | Vitest + Testing Library |
| Object storage | Storage-adapter interface: local filesystem in dev, any S3-compatible provider in production |
| Payments | Provider-adapter interface: COD, bKash, Nagad, Rocket, SSLCommerz, Card — sandbox/mock by default |
| Maps | Google Maps JavaScript API with an automatic simulated-map fallback when no API key is configured |

Nothing here is Vercel-specific. The app builds to a standard Node.js server (`next build` + `next start`, or the bundled `output: "standalone"` server), so it runs on Hostinger, a VPS, a container platform, or any Node-compatible host.

## Project structure

```
prisma/schema.prisma       Full data model (60+ models — see the file for the complete list)
prisma/seed.ts              Khagrachari Sadar demo data (see "Demo accounts")
src/app/(storefront)/...    Customer-facing site (home, marketplace, restaurants, cart, checkout, account)
src/app/vendor/...          Vendor & restaurant dashboard (role/business-type aware)
src/app/rider/...           Rider dashboard + live delivery tracking
src/app/admin/...           Admin dashboard (locations, advertising, tobacco compliance, payouts, refunds, ...)
src/lib/payments/           Payment provider adapters + registry
src/lib/storage/            S3-compatible storage adapter + local dev fallback
src/lib/maps/               Google Maps loader (client) with simulated-map fallback
src/lib/location/           Dynamic location hierarchy, point-in-polygon zone resolution
src/lib/orders/status-flow.ts   Server-enforced order status transition rules
src/lib/i18n/                Lightweight EN/BN dictionary system (cookie-based, no route doubling)
```

## Local development

Prerequisites: **Node.js 20.19+** (built and tested on Node 22/24) and a PostgreSQL database.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# then edit .env — at minimum set DATABASE_URL and AUTH_SECRET (see below)

# 3. Apply the database schema
npm run db:migrate:deploy   # or: npm run db:push  (for a quick local sync without migration history)

# 4. Seed demo data (Khagrachari Sadar categories, vendors, restaurants, coupons, demo accounts)
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open http://localhost:3000.

If you don't have a Postgres instance handy, the fastest local option is Docker Compose (see [Docker](#docker-optional)), or any managed free-tier Postgres (Neon, Supabase, Railway, Hostinger's own database add-on).

### Generating `AUTH_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

## Environment variables

All variables are documented with inline comments in **`.env.example`** — copy it to `.env` and fill in what you need. Nothing is hard-coded: currency, timezone, commission rate, free-delivery threshold, VAT rate, support contact info, and the tobacco-module switch are all environment/database-driven.

Variables are split into two files so client-safe values never leak server secrets:

- `src/lib/env/server.ts` — server-only, Zod-validated, throws on boot if something required is missing or malformed.
- `src/lib/env/public.ts` — only `NEXT_PUBLIC_*` values, safe to ship to the browser.

Key groups:

- **Core**: `DATABASE_URL`, `AUTH_SECRET`, `APP_URL` / `NEXT_PUBLIC_APP_URL`
- **Localization**: `DEFAULT_TIMEZONE` (Asia/Dhaka), `DEFAULT_CURRENCY` (BDT), `NEXT_PUBLIC_CURRENCY_SYMBOL` (৳)
- **Tobacco module**: `TOBACCO_SALES_ENABLED` (defaults `false` — see [Known limitations](#known-limitations))
- **Maps**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_SERVER_API_KEY`
- **Payments**: `BKASH_*`, `NAGAD_*`, `ROCKET_*`, `SSLCOMMERZ_*` (all optional — sandbox adapter is used when absent)
- **Storage**: `STORAGE_PROVIDER` (`local` | `s3`), `S3_*`
- **SMS / Email**: `SMS_PROVIDER`, `EMAIL_PROVIDER` (mock by default)

Runtime-editable settings that don't need a redeploy (support phone/email, commission %, free-delivery threshold, VAT %, rider pay rate) live in the `SiteSetting` table and are editable from **Admin → Settings**; the env vars are only their first-run defaults.

## Database

Schema: `prisma/schema.prisma`. Notable entity groups:

- **Identity**: `User`, `CustomerProfile`, `Vendor`, `VendorApplication`, `Restaurant`, `RiderProfile`
- **Dynamic location**: `Division`, `District`, `Upazila`, `Town`, `Neighbourhood`, `ServiceArea`, `DeliveryZone`, `DeliveryZoneBoundaryPoint`, `GeographicExclusionZone`, `CoverageRequest`
- **Catalog**: `Category`, `Product`, `ProductImage`, `ProductVariant`, `Inventory`, `RestaurantMenu`, `MenuItem`, `AddOnGroup`, `AddOn`
- **Ordering**: `Cart`, `CartItem`, `Wishlist`, `OrderGroup`, `Order`, `OrderItem`, `Delivery`, `DeliveryStatusHistory`, `RiderLocationUpdate`
- **Money**: `Payment`, `Transaction`, `Refund`, `Coupon`, `CouponRedemption`, `CommissionEntry`, `VendorPayout`
- **Advertising**: `Advertiser`, `Advertisement`, `AdPlacement`, `AdPricing`, `AdCampaign`, `AdPayment`, `AdImpression`, `AdClick`
- **Age-restricted compliance**: `AgeRestrictedProductSetting`, `AgeVerification`, `RestrictedDeliveryLog`
- **Platform**: `Review`, `Notification`, `SupportTicket`, `AuditLog`, `SiteSetting`

Useful commands:

```bash
npm run db:migrate          # create + apply a migration in development
npm run db:migrate:deploy   # apply existing migrations in production (no shadow DB needed)
npm run db:push             # push schema directly without a migration file (quick local iteration)
npm run db:seed             # run prisma/seed.ts
npm run db:studio           # open Prisma Studio
```

**Rider location retention**: `RiderLocationUpdate` rows carry an `expiresAt` (1 hour from creation). Nothing in this codebase deletes them automatically yet — wire up the cleanup described in [Background jobs](#background-jobs) before going live, so precise rider location history isn't retained indefinitely.

## Demo accounts

Seeded by `npm run db:seed`. **Password for every account: `Password123!`** — never reuse these credentials or this data shape in a real deployment.

| Role | Phone | Notes |
|---|---|---|
| Admin | `+8801700000001` | Full admin dashboard access |
| Vendor (grocery) | `+8801700000002` | "Sadar Fresh Mart" |
| Vendor (grocery) | `+8801700000003` | "Green Valley Grocers" |
| Restaurant | `+8801700000004` | "Pahari Rannaghor" |
| Restaurant | `+8801700000005` | "Chatgang Biriyani House" |
| Restaurant | `+8801700000006` | "Madhupur Fast Food Corner" |
| Rider | `+8801700000007` | Pre-approved, online |
| Customer | `+8801700000008` | Has a saved address and one delivered demo order |

Log in at `/login` with the phone number and password above.

All seeded place names, boundaries, delivery fees, and delivery times are **demonstration data** — verify and replace them before a real launch (see `prisma/seed.ts` for the exact values).

## Testing

```bash
npm run test          # run the full suite once
npm run test:watch    # watch mode
```

The suite covers pure business logic with no external dependencies (cart/coupon math, order status-transition rules — including the restaurant-only "Ready for pickup" step and the forward-only/no-skip guarantee, point-in-polygon zone resolution, restaurant opening-hours logic across timezone/midnight boundaries, Bangladeshi phone validation) plus integration tests that exercise coupon validation and delivery-zone resolution against a real seeded database. A few component tests cover loading/disabled states and accessible validation messaging.

Not covered by automated tests in this build: full checkout/payment flows and role-gated page rendering, which were instead verified manually against a real database throughout development (see [Known limitations](#known-limitations) for what a next pass of E2E tests — e.g. Playwright — should add).

## Production build

```bash
npm run build
npm run start
```

`npm run start` runs `next start`, which serves the exact build produced by `npm run build`. This is the same command used in every deployment path below.

The build also produces a self-contained bundle at `.next/standalone/server.js` (enabled via `output: "standalone"` in `next.config.ts`) for hosts where you want to deploy a minimal bundle instead of the full repo + `node_modules`. To run it:

```bash
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

Both `next start` and the standalone `server.js` were used to verify this build during development.

## Payment integration

All payment methods listed in the checkout flow — **Cash on delivery, bKash, Nagad, Rocket, SSLCommerz, Card** — go through a common `PaymentAdapter` interface (`src/lib/payments/`). The registry (`src/lib/payments/registry.ts`) picks the real adapter only when its provider mode is `live` **and** its credentials are present; otherwise every provider falls back to a mock adapter that redirects to an on-site "Sandbox Payment" screen clearly labeled as a simulation. **No live payment provider works out of the box, and none is misrepresented as working — this is intentional.**

- `sslcommerz-adapter.ts` and `bkash-adapter.ts` implement the real session/token API calls per each provider's published docs, but have **not** been exercised against a live sandbox merchant account in this build. Test them against real sandbox credentials before flipping `SSLCOMMERZ_MODE=live` / `BKASH_MODE=live`.
- `nagad-adapter.ts` and `rocket-adapter.ts` are documented placeholders: Nagad requires RSA-signed request payloads that need a real merchant account to implement and verify; Rocket (DBBL) has no public self-serve API and requires a direct merchant agreement with the bank. Both throw a clear, descriptive error if `*_MODE=live` is set without a working implementation, so misconfiguration fails loudly instead of silently pretending to charge someone.

To connect a real provider: obtain merchant credentials, set `{PROVIDER}_MODE=live` plus the provider's credential variables in `.env.example`, and (for bKash/SSLCommerz) verify the adapter against their sandbox before going live. Webhook endpoints are already wired: `POST /api/payments/webhook/[provider]` re-verifies every callback server-side and is idempotent (a replayed webhook for an already-settled payment is a no-op).

## Google Maps setup

Live delivery tracking (`src/components/maps/delivery-map.tsx`) uses the Google Maps JavaScript API when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set, and automatically renders an on-brand **simulated map** (clearly labeled as such) when it isn't — the app never breaks or looks unfinished without a Maps key.

To enable real maps:

1. In Google Cloud Console, create a project and enable **Maps JavaScript API** and **Places API**.
2. Enable billing on the project (Google requires this even within the free usage tier).
3. Create an API key restricted to:
   - **Application restriction**: HTTP referrers, limited to your production domain(s).
   - **API restriction**: Maps JavaScript API + Places API only.
4. Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to that key. This key is intentionally public (browser-exposed) — the referrer + API restrictions are what keep it safe, not secrecy.
5. If you later add server-side geocoding, create a **separate** server-only key (`GOOGLE_MAPS_SERVER_API_KEY`), restricted by IP and to the Geocoding API only. Never reuse the browser key for server calls.
6. Google Maps requires HTTPS in production; your Hostinger domain's free SSL certificate covers this.

Rider live-location sharing (`/api/rider/location`, `/api/orders/[orderId]/tracking`) only runs while a delivery's `Delivery.isTrackingActive` flag is true, stops automatically at delivery/cancellation/failure, and a customer can only ever fetch the rider assigned to their own order (enforced server-side, not just hidden in the UI).

## Object storage

`src/lib/storage/` defines a `StorageAdapter` interface with two implementations:

- **`local-adapter.ts`** — writes to `public/uploads/dev/`. Development only; most hosting filesystems (including typical Node app hosting) are not guaranteed persistent across restarts/redeploys, so this must not be used in production.
- **`s3-adapter.ts`** — any S3-compatible provider (AWS S3, Cloudflare R2, Wasabi, Backblaze B2, MinIO, or Hostinger Object Storage) via `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` / `S3_PUBLIC_URL_BASE`.

Set `STORAGE_PROVIDER=s3` and the `S3_*` variables in production. Uploads (vendor documents, logos, product photos, menu item photos, ad creatives) all go through `POST /api/uploads`, which validates file type (JPEG/PNG/WebP/PDF) and size (8MB max) server-side regardless of which adapter is active.

Seed/demo product images are deliberately omitted — product cards render a category-tinted placeholder (`src/components/product/product-image.tsx`) instead of stock photography, so the repository has no risk of copyright-encumbered images and there's nothing to swap out except real vendor-uploaded photos.

## Background jobs

Not implemented as running schedulers in this build (no queue/cron infra is assumed), but the endpoints and logic they'd call are ready:

- **Rider location retention**: call `purgeExpiredRiderLocations()` (`src/lib/rider/location.ts`) on a schedule (e.g. hourly) to delete `RiderLocationUpdate` rows past their `expiresAt`.
- **Ad campaign expiry**: `AdCampaign` rows past their `endDate` should transition to `EXPIRED`. The homepage ad slot query already filters by date range regardless of the stored `status`, so a stale `ACTIVE` row never actually renders — but a scheduled job should still update the field for accurate reporting.

Wire either one up with `CRON_SECRET`-protected API routes and Hostinger's cron feature (or an external scheduler like GitHub Actions/cron-job.org hitting the route on a schedule).

## Replacing mock services with live ones

Every external integration is behind an adapter/registry, not called directly from route/page code:

| Concern | Adapter location | Swap by |
|---|---|---|
| Payments | `src/lib/payments/registry.ts` | Setting `{PROVIDER}_MODE=live` + credentials |
| Storage | `src/lib/storage/registry.ts` | Setting `STORAGE_PROVIDER=s3` + `S3_*` |
| Maps | `src/lib/maps/loader.ts` | Setting `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` |
| SMS | `SMS_PROVIDER` env (currently mock-only stub) | Implement a real adapter following the payment/storage pattern |
| Email | `EMAIL_PROVIDER` env (currently mock-only stub) | Implement an SMTP adapter following the same pattern |

No page or Server Action imports a concrete provider SDK directly — they all go through these seams, so none of this requires touching UI code.

## Deployment

The finished app is a **standard Node.js application** — `npm run build` + `npm run start` (or the standalone bundle). It does not depend on any Vercel-only feature (no Vercel KV/Blob/Edge Config, no `next/og` platform lock-in, no Vercel Cron). It's portable to Hostinger, any VPS, Railway, Render, Fly.io, or a container platform.

> **Important**: dynamic Next.js features (Server Actions, API routes, cookies/sessions, on-demand rendering) require **Hostinger Node.js Web App hosting, Hostinger Cloud hosting, or a VPS** — not Hostinger's basic static/shared web hosting, which cannot run a Node.js server process.

Common setup for every path below:

1. Provision a PostgreSQL database (Hostinger's managed database, or an external provider like Neon/Supabase) and note its connection string.
2. Provision S3-compatible object storage (see [Object storage](#object-storage)).
3. Prepare your `.env` values (copy `.env.example`, fill in real secrets — never commit this file).

### Hostinger Node.js Web App hosting

1. In hPanel, create a **Node.js** application and point it at your app's root directory.
2. Set the **startup file** to `server.js` if deploying the standalone build, or use `npm start` as the run command if deploying the full repo.
3. Set **Node.js version** to 20 or later.
4. Add every variable from `.env.example` under the app's Environment Variables screen (with real values).
5. Set the build command to:
   ```
   npm install && npm run db:migrate:deploy && npm run build
   ```
6. Start (or restart) the app from hPanel after the first deploy.
7. Attach your custom domain and enable the free SSL certificate from hPanel's SSL section.

### Hostinger Cloud hosting

Same as the Node.js Web App path — Cloud hosting plans support Node.js applications through the same hPanel interface, with more resources/isolation. Follow the steps above; the build/start commands are identical.

### Hostinger VPS

1. SSH in, install Node.js 20+ (e.g. via `nvm` or your distro's Node 20+ package) and PostgreSQL (or point at a managed Postgres instead).
2. Clone the repo (or upload a ZIP — see below) and `cd` into it.
3. `cp .env.example .env` and fill in real values.
4. ```
   npm install
   npm run db:migrate:deploy
   npm run db:seed   # optional — demo data; skip for a real launch
   npm run build
   ```
5. Run the app under a process manager so it survives reboots and restarts on crash:
   ```
   npm install -g pm2
   pm2 start npm --name pickup -- start
   pm2 save
   pm2 startup
   ```
6. Put Nginx (or Caddy) in front as a reverse proxy to port 3000, and issue a free SSL certificate with Certbot (or Caddy's automatic HTTPS).
7. Alternatively, use the included `Dockerfile`/`docker-compose.yml` (see below) instead of a bare Node + PM2 setup.

### GitHub-based deployment

1. Push this repository to GitHub (private is fine).
2. In Hostinger's Node.js app settings (or your VPS), connect the GitHub repo and select the branch to deploy.
3. Configure the same build command as above (`npm install && npm run db:migrate:deploy && npm run build`) and start command (`npm start`).
4. Enable auto-deploy on push if you want every merge to `main` to redeploy automatically; otherwise trigger deploys manually from hPanel.

### ZIP-file deployment

1. On your machine, make sure `node_modules`, `.next`, and `.env` are excluded (see `.gitignore`/`.dockerignore` for the list), then zip the project directory.
2. Upload the ZIP through Hostinger's File Manager (or `scp` to a VPS) and extract it into your app's root directory.
3. Create `.env` directly on the server (never inside the ZIP) with real secrets.
4. Run the same install/migrate/build/start sequence as the VPS instructions above.

### Docker (optional)

A `Dockerfile` and `docker-compose.yml` are included for a VPS or any container platform (not required for Hostinger's Node.js/Cloud hosting, which runs the app directly).

```bash
cp .env.example .env   # fill in real values
docker compose up --build
```

This starts the app (port 3000) and a Postgres 16 container together. For production, point `DATABASE_URL` at a managed Postgres instead of the bundled container, and run `docker build -t pickup .` + `docker run` (or your platform's Docker deployment flow) directly.

### Webhook URLs

Once deployed, configure each payment provider's dashboard to send callbacks to:

```
https://your-domain.tld/api/payments/webhook/{PROVIDER}
```

replacing `{PROVIDER}` with `BKASH`, `NAGAD`, `ROCKET`, `SSLCOMMERZ`, or `CARD`.

### Backup and recovery

- **Database**: use your Postgres provider's automated backups (Hostinger's managed DB, Neon, and Supabase all offer point-in-time or scheduled backups). For a self-managed VPS Postgres, schedule `pg_dump` to run daily and ship the output off-server (e.g. to your S3-compatible bucket).
- **Object storage**: S3-compatible providers typically offer versioning/lifecycle rules — enable them on your bucket rather than relying on the app.
- **Secrets**: keep a secure copy of your `.env` values outside the server (a password manager or your infra provider's secret store) — nothing in this repo stores them anywhere but environment variables.

### Deployment logs & process restart

- **Hostinger Node.js/Cloud hosting**: view logs and restart the app from the hPanel Node.js application screen.
- **VPS with PM2**: `pm2 logs pickup` to tail logs, `pm2 restart pickup` to restart.
- **Docker**: `docker compose logs -f app`, `docker compose restart app`.

## Known limitations

Read this before treating any part of this build as launch-ready:

- **No real payment, SMS, or email provider is connected.** Payments run in sandbox/mock mode; SMS and email adapters are stubs. See [Payment integration](#payment-integration) and [Replacing mock services](#replacing-mock-services-with-live-ones).
- **Nagad and Rocket payment adapters are unimplemented placeholders** (they throw a clear error rather than pretending to work) — see [Payment integration](#payment-integration) for why.
- **The tobacco/age-restricted product module is disabled by default** (`TOBACCO_SALES_ENABLED=false`) and must stay that way until a qualified lawyer completes a jurisdiction-specific compliance review. The data model, exclusion-zone logic, and admin kill switch exist; the customer-facing purchase flow (DOB collection at checkout, rider ID-check UI) is intentionally not built out further than the compliance settings and audit-log scaffolding, since the module must not go live without that review regardless.
- **Legal pages (`/legal/terms`, `/legal/privacy`) are placeholder template text**, explicitly marked as such on the pages themselves — have a lawyer finalize them for your jurisdiction.
- **Seed data (place names, delivery fees, coordinates, prices) is demonstration data** — verify and replace before real use.
- **No end-to-end test suite** (e.g. Playwright) covering full checkout/payment/dashboard flows through a real browser — the current suite covers business logic and a couple of components (see [Testing](#testing)). Flows were manually verified against a real database during development, but that verification isn't captured as regression tests.
- **No rate limiting beyond a single-process in-memory limiter** (`src/lib/security/rate-limit.ts`) — fine for one Node instance, but swap it for a shared store (Redis/Upstash) behind the same `RateLimiter` interface before running multiple instances behind a load balancer.
- **No automated background jobs** — see [Background jobs](#background-jobs) for what to schedule before launch (rider location retention in particular has a real privacy implication if left unscheduled).
- **Restaurant add-on groups have no dedicated vendor-dashboard UI** — they're supported end-to-end in the schema, cart, and checkout, and seeded with examples, but a restaurant owner can't create new add-on groups from the dashboard yet (only menu items).
- **No formal security audit or penetration test** has been performed. Input validation, RBAC, and auditing are implemented throughout, but treat this as unaudited until reviewed.
- **`npm audit` currently reports 3 high-severity advisories** in `postcss`/`sharp`, both bundled *inside* Next.js itself (not a direct dependency choice here). `npm audit fix --force`'s suggested "fix" is to downgrade Next.js to version 9 — do not do this. Monitor for a Next.js patch release instead.

## Recommended next steps

1. Obtain real merchant credentials for at least one payment provider (SSLCommerz is the most straightforward to integrate for card + mobile banking coverage) and test the adapter against its sandbox before flipping it to `live`.
2. Commission a legal/compliance review before enabling the tobacco module, and have a lawyer finalize the Terms/Privacy pages.
3. Add Playwright (or similar) end-to-end coverage for registration → order → delivery and the three dashboards.
4. Wire up the two background jobs described above with real scheduling.
5. Replace the SMS/email mock adapters with a real provider (e.g. a Bangladeshi SMS gateway, and SES/Postmark/SMTP for email) so order/status notifications actually reach customers.
6. Load real vendor/restaurant photography once real vendors are onboarded (the placeholder image system was a deliberate choice to avoid unlicensed stock photography — see [Object storage](#object-storage)).
7. Run a security review (dependency audit, auth/session review, upload validation) before accepting real orders or real payments.
