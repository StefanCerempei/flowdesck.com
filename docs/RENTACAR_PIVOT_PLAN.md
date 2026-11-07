# Flowdesck rental pivot — Phase 1 audit and Phase 2 plan

## Current checkout audit · 8 November 2026

The original audit below describes commit `49f991c`. The working tree on `feat/rentacar-pivot-foundation` already contains uncommitted Phase 2 work. Use the original schema, endpoint table and file plan as design history. For the actual fleet contracts and exact file manifest, see [Phase 2 implementation](PHASE2_IMPLEMENTATION.md#endpoints-and-contracts).

| Area | Current state | Consequence for the next developer |
| --- | --- | --- |
| Rental data and writes | Vehicle and Reservation models, a legacy baseline and an additive migration exist locally. Decimal amounts, tenant-scoped composite relations, a per-vehicle InnoDB row lock and half-open dates are implemented. | Reuse the existing availability and booking services. Deployment to an existing database still requires a schema/history comparison. Defer VehicleExpense. |
| Product UI | Fleet Dashboard, Vehicles, Reservations, Clients, tasks, invoices and settings exist. The shared API client and RentalUI components are available. | Keep the rental screens. Replace the Copilot placeholder when AI work starts. Add Insights to React routing, workspace navigation and the Express SPA allowlist. |
| AI | The legacy server-side Gemini route summarizes CRM invoice activity. The rental dashboard reads the fleet API. There is no rental proposal or Insights handler. | Model output may supply validated inquiry fields or approved recommendation codes. The backend supplies every offer, metric and action target. Use the existing role-protected reservation POST after human review. |
| Radar | Fleet dashboard computes booked value, overdue returns and insurance attention. It loads the tenant’s reservations into memory. Scheduled utilization and actionable recommendation responses are missing. | Share metric definitions, add window-scoped queries and test the three indicators against known fixture values. |

**Fresh verification.** Node 22.23.4 and npm 10.9.9 resolved the installed workspaces. The Vite production build passed with two CSS import-order warnings. Prisma schema validation passed using a dummy URL. All three domain tests and all 23 CRM/rental integration tests passed. Integration tests used the documented Podman container with the private connection verified as loopback port 34343 and database `flowdesck_test`. The suite exercised tenant isolation, role checks, adjacent bookings and simultaneous overlapping creates/edits. A separate HTTP smoke returned 200 for health, 401 for unauthenticated fleet, availability, vehicle and briefing requests, and 404 for both proposed AI endpoints. Lint exits 127 because ESLint is missing. The earlier Chromium results remain recorded in the implementation report. Browser tests were not repeated in this audit.

**Configuration.** The shell has no exported DATABASE_URL, TEST_DATABASE_URL, JWT_SECRET, GEMINI_API_KEY or VITE_API_BASE_URL. Only the example backend env file is present. The dedicated test credentials were injected into the integration process privately. The Gemini key is optional for the legacy local fallback. Live provider access and the production database are unverified.

**Next implementation slice.** Once AI implementation is authorized, Developer A starts with a fake-provider contract test in `crm-saas/backend/test/ai.test.js` for POST `/api/ai/booking-proposals`. A missing end date must return a clarification and zero offers. A complete inquiry must call the existing tenant-scoped availability service and leave reservation count unchanged. Developer B starts `crm-saas/frontend/src/pages/ai/BookingCopilot.jsx` against that contract and wires it through `App.jsx`, using the existing confirmation/quote workflow. Demonstrate missing-key manual mode and a stale offer before adding Radar. Section 5 defines Radar metrics and actions, and section 9 lists the full demo acceptance criteria.

### Historical Phase 1 baseline

Audit date: 2026-11-07 (Europe/Bucharest). Source: `origin/main` at `49f991c` (`business plan 2.0`). Local branch: `feat/rentacar-pivot-foundation`. Phase 1 only: no application, schema, database, production, or remote Git changes.

## 1. Repository and development baseline

The supplied workspace was an empty outer Git repository, with no files, commits, or remote. The source was cloned into `crm-saas/`. **Paths below are relative to the cloned repository root**, not the outer workspace. The source itself contains a second `crm-saas/` directory:

```text
<clone>/package.json                 deployment wrapper
<clone>/index.js                     production entry point
<clone>/crm-saas/package.json        npm workspace root
<clone>/crm-saas/frontend/           React application
<clone>/crm-saas/backend/            Express application
<clone>/docs/RENTACAR_PIVOT_PLAN.md   this plan
<clone>/HANDOFF.md                   next-session entry point
```

No `AGENTS.md` was found. Clone was clean before branch creation; no existing user changes were overwritten. No push or commit was made. The empty outer repository was left intact.

Verified installed versions: React/React DOM 18.3.1, Vite 5.4.21, React Router DOM 6.30.6, Axios 1.21.0, Express 4.22.3, Prisma CLI/client 5.22.0. Schema provider is MySQL. `pg` is installed but unused by application source. `@prisma/config` 7.10.1 and old `@prisma/cli-engine` 0.9.0 coexist with Prisma 5; `backend/prisma.config.ts` uses the old cli-engine API, while the tested Prisma 5 commands load `prisma/schema.prisma` successfully. Do not upgrade Prisma or rely on that config as part of this pivot.

Node/npm were absent from PATH. A checksum-verified official Node 22.23.4 runtime was extracted outside the repository at `/tmp/flowdesck-node22/node-v22.23.4-linux-x64/`. npm version is 10.9.9. This temporary setup is session-local; install/use Node 22 normally for persistent development.

### Executed checks

| Command/check | Result |
| --- | --- |
| `npm ci --include=dev` from `crm-saas/` workspace | PASS; 341 packages added, lockfile unchanged |
| `npm ls --depth=0` | PASS; both workspaces resolved |
| `npm run build` from workspace | PASS; Vite transformed 1,573 modules; JS 291.77 kB / gzip 91.24 kB; CSS 62.92 kB / gzip 12.88 kB |
| `npm run lint --workspace=frontend` | FAIL / setup blocker: `eslint: command not found`; ESLint dependency and config are absent |
| `npm run db:generate --workspace=backend` | PASS; Prisma client 5.22 generated locally; no DB access |
| `npx --workspace=backend prisma validate` | PASS with command-local dummy MySQL URL on port 1; schema validation only, no connection |
| Proposed additive schema validated in `/tmp/flowdesck-proposed-schema.prisma` | PASS under Prisma 5.22, including composite tenant relations; no repository schema change or DB access |
| `node --check` on root entry and backend JS outside node_modules | PASS; 25 files |
| Ephemeral local Express HTTP smoke | PASS: health/CORS 200, six protected routes 401 without token, malformed JSON 400, unknown API 404; no DB/AI requests |
| `npm audit --json` | 6 advisories: 5 moderate, 1 high; no automatic fixes applied |
| Backend integration suite | NOT RUN: no dedicated `TEST_DATABASE_URL` configured |
| Live login/CRM DB operations, seed, live Gemini, browser end-to-end | NOT RUN: no configured DB/JWT/key; not claimed verified |

Build warnings: `frontend/src/index.css` puts imports after Tailwind statements, repeats Tailwind directives, mixes `@import "tailwindcss"` with v3 directives; no PostCSS config exists. Keep existing appearance; repair separately with visual verification, not a CSS rewrite. Audit flags Vite (high), esbuild, minimatch, nodemon, react-router and react-router-dom (moderate). Some recommended fixes are major upgrades: investigate reachable advisory scope and compatible patches separately; do not run `npm audit fix --force`.

`DATABASE_URL`, `TEST_DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `VITE_API_BASE_URL`, `PORT`, `NODE_ENV` were absent from the execution environment. Only `backend/.env.example` exists; it contains placeholders. No secret values were printed or written. No migration, `db push`, seed, or DB connection was performed.

## 2. Architecture audit

### Implemented functionality (source-backed; DB behavior not executed here)

| Area | Actual behavior and reusable files |
| --- | --- |
| Authentication | `backend/routes/auth.js`: validated registration atomically creates Company + SUPER_ADMIN User; bcrypt hashing; duplicate email 409; login signs HS256 JWT for one day. `src/middleware/auth.middleware.js` verifies token and reloads user/company/role from DB on every protected request. `src/modules/auth/auth.js` is a compatibility re-export. |
| Tenancy | Company is tenant. User uses `companyId`; Contact, Task, Invoice use `tenantId`. Existing lists/aggregates filter tenant; mutations first find by id + tenant, then update/delete by id. Invoice creation verifies contact ownership. Preserve old column names. `tenant.middleware.js` exists but mounted routes use `req.user.companyId` directly. |
| Contacts | GET/POST `/api/contacts`, PUT/DELETE `/:id`; reusable client records, partial updates, notes, source, optional fields. UI has table, local search, create/edit modal, delete confirmation, loading/error states. |
| Tasks | GET/POST `/api/tasks`, PATCH/DELETE `/:id`; validated title/priority; dashboard creates and toggles tasks. Company-wide tasks, not assigned per user; no due date or entity relation. |
| Invoices | GET/POST `/api/invoices`, DELETE `/:id`; optional contact, finite positive amount, status/date validation. UI lists/searches/creates/deletes; **no update/mark-paid endpoint**. Keep working legacy feature, secondary navigation. |
| Dashboard | GET `/api/dashboard/summary`: contact counts, simple pipeline, tasks, paid invoice totals for current UTC creation month, last four 7-day buckets and explicit overdue invoice count. Two middle pipeline stages are hardcoded zero; not a pipeline system. |
| Settings | GET/PATCH `/api/settings`: own company name + plan; name changes restricted to ADMIN/SUPER_ADMIN. No billing integration. |
| AI | POST `/api/dashboard/brief`: aggregate-only server-side Gemini REST call, 12-second timeout, max 5 calls/minute across process, local deterministic fallback on missing key/quota/provider errors. Response `{source:'gemini'|'local', text}` is labeled in UI. |
| Frontend shell | `App.jsx` BrowserRouter; public `/`, `/login`, `/register`; Workspace children `/dashboard`, `/contacts`, `/invoices`, `/settings`. `Workspace.jsx` responsive/collapsible navigation and logout; token presence guard; `workspace.css` layout. |

### Gaps and blockers

- No Vehicle, Reservation, availability, rental analytics, booking copilot, or rental dashboard implementation exists.
- `permission.middleware.js` and `subscription.middleware.js` are empty. Except settings rename, protected CRM writes currently allow any authenticated role, including VIEWER. Tenant isolation is present; full role authorization is not. SUPER_ADMIN is company-local, not permission to cross tenants.
- `ForgotPassword.jsx`, `ResetPassword.jsx`, `onboarding/CreateCompany.jsx`, `onboarding/SelectPlan.jsx` are empty/unrouted. Existing `crm-saas/docs/{architecture,api-documentation,database-schema}.md` are empty.
- Invoice money and Contact potentialValue use Float; invoice dueDate is String; no paidAt. Existing revenue is paid-status invoices grouped by creation time, not actual cash receipts. Do not carry that label into rental revenue/profit.
- Invoice status does not update automatically from due date. No payment processor, team invitation, billing enforcement, mail, calendar, or external booking integration found in code.
- Existing auth tokens/user live in localStorage; there is no shared API client/401 handler, session refresh or server logout. Settings parses stored user JSON without a catch. New pages should use a shared API client and safe role parsing.
- Existing tenant checks are application-level; invoice/contact relation does not itself enforce matching tenants in DB. New relations should enforce it; retain old data unchanged.
- Existing collections are unpaginated; adequate for 5–30 demo vehicles but bound new date ranges/list sizes. Existing contact delete must handle newly referenced reservations (409 instead of 500).
- Tests are one MySQL integration file `backend/test/backend.test.js` (12 test declarations): auth, registration race, tenant boundaries, contact partial update, invoices, validation, CORS, dashboard month, malformed JSON. They require TEST_DATABASE_URL but do not prove its isolation from production. Verify dedicated disposable DB identity explicitly. No frontend tests, concurrency booking tests, CI workflow, migration history, Docker or infrastructure config found.
- Seed `backend/scripts/seed-demo.js` writes synthetic TermoFix service-business data (32 days), is atomic/idempotent by email, and prints generated demo credentials once. It does not seed rentals. Never execute against an unknown DB.

### Integrations and deployment assumptions

Root `npm run build` runs workspace `npm ci --include=dev` then frontend build; root `npm start` invokes `index.js`, defaults NODE_ENV to production and loads Express. Comment names Hostinger; actual hosting settings were not inspected. Express serves frontend dist only in production and has a **fixed SPA deep-link allowlist**: add every new rental route there, otherwise refreshing it returns JSON 404. Health does not check DB connectivity.

Development: Vite port 3000 proxies `/api` to Express port 5000. CORS allows localhost/127.0.0.1 ports 3000/5173 and the two production Flowdesck domains. Same-origin deployment requires no VITE_API_BASE_URL; separate frontend needs that origin at build time and an intentionally configured CORS origin. `dotenv/config` reads from process working directory: run backend commands from `crm-saas/backend` for backend/.env, or inject environment explicitly when running workspace/root scripts. Do not assume `npm run dev` at workspace root loads backend/.env.

Existing Gemini model is hardcoded to `gemini-3.1-flash-lite` in `brief.js`. Its availability for the actual project/key is unverified. No client SDK is used. Keep `GEMINI_API_KEY` server-only (never VITE-prefixed), introduce server-only `GEMINI_MODEL` in Phase 2, retain an explicit local mode. Existing process-global budget is neither tenant-fair nor distributed.

## 3. Minimal database extension — proposal only

P0: two tables and additive reverse relations/indexes; no renaming Company/Contact or Float migrations. EUR only for this demo, server constant surfaced in responses. Rentals use **date-only calendar days** `YYYY-MM-DD` in company operating timezone `Europe/Bucharest` (P0 fixed constant). Start inclusive/end exclusive: Nov 10–12 means two billed days. No timed pickups/DST-hour pricing in this day-one MVP. Store dates as MySQL DATE, represented by Prisma DateTime UTC-midnight values; calculate days from calendar-date ordinals, never local elapsed milliseconds. Compute operational “today” explicitly in Europe/Bucharest. Timestamp fields createdAt/updatedAt are UTC instants.

Proposed Prisma additions (validated as an isolated combined schema with Prisma 5.22; not applied; still require migration testing on disposable MySQL):

```prisma
enum VehicleStatus {
  AVAILABLE
  MAINTENANCE
  INACTIVE
}
enum Transmission {
  MANUAL
  AUTOMATIC
}
enum ReservationStatus {
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
model Vehicle {
  id                  String        @id @default(uuid())
  companyId           String
  company             Company       @relation(fields: [companyId], references: [id], onDelete: Restrict)
  brand               String        @db.VarChar(80)
  model               String        @db.VarChar(80)
  licensePlate        String        @db.VarChar(32)
  category            String        @db.VarChar(40)
  transmission        Transmission
  dailyRate           Decimal       @db.Decimal(10, 2)
  status              VehicleStatus @default(AVAILABLE)
  insuranceExpiration DateTime?     @db.Date
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt
  reservations        Reservation[]

  @@unique([companyId, licensePlate])
  @@unique([companyId, id])
  @@index([companyId, status])
  @@index([companyId, insuranceExpiration])
}
model Reservation {
  id          String            @id @default(uuid())
  companyId   String
  company     Company           @relation(fields: [companyId], references: [id], onDelete: Restrict)
  vehicleId   String
  vehicle     Vehicle           @relation(fields: [companyId, vehicleId], references: [companyId, id], onDelete: Restrict, onUpdate: Restrict)
  contactId   String
  contact     Contact           @relation(fields: [companyId, contactId], references: [tenantId, id], onDelete: Restrict, onUpdate: Restrict)
  startDate   DateTime           @db.Date
  endDate     DateTime           @db.Date
  status      ReservationStatus @default(CONFIRMED)
  agreedTotal Decimal           @db.Decimal(12, 2)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@index([companyId, vehicleId, status, startDate, endDate])
  @@index([companyId, status, endDate])
  @@index([companyId, startDate])
  @@index([companyId, contactId])
}
// Add to existing Company: vehicles Vehicle[], reservations Reservation[]
// Add to existing Contact: reservations Reservation[], @@unique([tenantId, id])
```

Composite relations prevent cross-company vehicle/contact links even if service validation is bypassed. Existing IDs remain unchanged. Normalize plate by trim/uppercase and removal of whitespace/hyphens consistently before storing; category allowlist ECONOMY/COMPACT/SUV/VAN is server validated. No hard delete endpoints: mark vehicles inactive; cancel reservations. Contact delete blocked with 409 while reservation history references it; company deletion remains restricted.

Money: accept canonical nonnegative decimal **strings**, max 2 fractional digits and explicit upper bounds matching columns; dailyRate must be positive, agreedTotal positive. Use Prisma.Decimal or integer cents for multiplication, never parseFloat or JS floating-point sums. Serialize exactly two decimals (`"90.00"`) and `currency:"EUR"`. Server computes default total = current dailyRate × billed days; admin can explicitly override agreedTotal, validated and shown at confirmation. Existing invoices stay separate; do not sum both as rental revenue. Historical agreedTotal survives future rate changes.

Server validation: strict JSON allowlist, actual valid dates (reject rollover), start < end, max 365 rental days, UUID IDs, valid enums, max lengths, finite bounded money. New reservations start CONFIRMED, require start >= operational today; future/active edits obey same rules except unchanged historical start. All reads/updates/deletes/raw SQL include authenticated companyId; never trust body/query companyId. Parent lookups also scoped. ADMIN/SUPER_ADMIN write; VIEWER read; AI proposal/insight generation read-only but authenticated/rate limited. Return 404 for inaccessible IDs.

### Active overlap and concurrency: P0 correctness requirement

Blocking statuses: CONFIRMED, IN_PROGRESS. Standard overlap predicate:

```text
existing.startDate < requested.endDate AND existing.endDate > requested.startDate
AND existing.status IN (CONFIRMED, IN_PROGRESS)
AND existing.companyId = authenticatedCompanyId
AND existing.vehicleId = requestedVehicleId
AND existing.id != editedReservationId (when editing)
```

Adjacent reservations allowed. Offers are not holds. A read-then-insert or unique index alone is insufficient for intervals. Use one short Prisma interactive transaction with MySQL InnoDB **ReadCommitted**, and a parameterized `SELECT id FROM Vehicle WHERE companyId = ? AND id = ? FOR UPDATE` as the mutex. Every create, date edit, status transition, and vehicle operational-status/rate edit must follow the same locking protocol; no Gemini calls inside a transaction. Then verify tenant/contact/status, re-read overlaps with the transaction client, recompute/verify price, write, commit. Waiting writers acquire the same vehicle lock and see the committed predecessor before checking.

Keep vehicleId immutable after reservation creation for P0; cancel + recreate to change vehicle. For reservation updates, lock the owned vehicle, re-read the reservation under that lock and validate state before writing. For P1 reassignment, lock old/new vehicles in sorted ID order, re-read state and retry if changed. Do not allow unguarded Prisma writes in controllers/seeds/import paths. Retry bounded transaction deadlocks/P2034 (e.g. up to 3 attempts with jitter), then structured 409/503. Database constraint conflicts such as duplicate plate return 409. Prove this on a dedicated MySQL DB with **two independent simultaneous requests**: exactly one conflicting booking succeeds.

State transitions: CONFIRMED → IN_PROGRESS (not before start day), CONFIRMED → CANCELLED, IN_PROGRESS → COMPLETED (actual return confirmed by human); COMPLETED/CANCELLED terminal. Only CONFIRMED dates editable. Early returns release capacity on completion; historical planned period remains visible. Reject MAINTENANCE/INACTIVE changes if conflicting active/future commitments exist; resolve them first. AVAILABLE is an operational eligibility flag, **not** a stored “currently rented” state; derive occupancy from reservations.

Conservative overdue policy: IN_PROGRESS with endDate <= operational today blocks new bookings on that vehicle until operator marks return COMPLETED, even for a later interval. Use the same extra check for availability and writes. A missed pickup in CONFIRMED is a separate concern, not an overdue return.

No migrations exist in source. Before Phase 2 DB work, identify the disposable local/demo DB and MySQL version/engine. Create/review an additive migration against it. If adopting Prisma Migrate for an existing deployed DB, plan an introspected baseline separately; do not run migrate dev/reset/db push on production or infer deployment history. Inspect existing records/indexes before new Contact unique index. Verify native composite FKs and migration SQL locally. DB CHECK constraints for dates/positive money can be added only after confirming MySQL version/enforcement; server validation is mandatory regardless.

VehicleExpense is P1, not required to detect the three promised indicators. Without expenses, do not claim net profit, maintenance costs, or quantified lost revenue. If later added: id/companyId/vehicleId, category, amount Decimal(12,2), incurredOn DATE, note?, timestamps; composite tenant FK; indexes [companyId,vehicleId,incurredOn] and [companyId,incurredOn].

## 4. API contracts for Phase 2

Reuse Bearer JWT + protectRoute, shared Prisma and JSON errors. Existing CRM endpoints remain unchanged. New endpoints use `{error:{code,message,fields?}}`; HTTP 400 validation, 401 unauthenticated, 403 forbidden role, 404 inaccessible record, 409 overlap/duplicate/state/changed quote, 429 tenant rate limit, 503 temporary write failure. New list responses `{items:[], nextCursor:null}` with default limit 50/max 100; date query ranges max 365 days. Dates serialize date-only; money serializes strings. Do not include raw prompts/provider errors in API logs.

| Endpoint | Contract |
| --- | --- |
| GET `/api/vehicles?status=AVAILABLE&category=COMPACT&cursor=...&limit=50` | `{items:[VehicleDTO],nextCursor}` scoped to caller |
| POST `/api/vehicles` | ADMIN body `{brand,model,licensePlate,category,transmission,dailyRate,insuranceExpiration?}` → 201 VehicleDTO |
| PATCH `/api/vehicles/:id` | ADMIN partial allowlist of vehicle fields; no id/companyId; lock/recheck commitments → VehicleDTO |
| GET `/api/reservations?from=2026-11-10&to=2026-11-17&status=CONFIRMED&vehicleId=...` | Matching intervals intersect range, scoped; `{items:[ReservationDTO],nextCursor}` |
| GET `/api/reservations/availability?startDate=2026-11-10&endDate=2026-11-12&category=COMPACT&transmission=AUTOMATIC` | `{startDate,endDate,billedDays:2,currency:'EUR',items:[{vehicle:VehicleDTO,total:'90.00'}],checkedAt}`; live eligibility + overlap/overdue check, not a hold; mount before `/:id` |
| GET `/api/reservations/:id` | ReservationDTO, owned record only |
| POST `/api/reservations` | ADMIN `{vehicleId,contactId,startDate,endDate,agreedTotal:'90.00',confirmed:true}` → 201 ReservationDTO; server transaction verifies total matches current computed price, or an explicit admin override flag; no booking from AI endpoint |
| PATCH `/api/reservations/:id` | ADMIN CONFIRMED date/total changes, or allowed status transition; include `expectedUpdatedAt` from last DTO for stale-edit 409; lock and revalidate |
| GET `/api/fleet/dashboard?from=2026-11-01&to=2026-12-01` | `{asOf,today,timezone,currency,stats:{totalVehicles,outNow,availableToday,maintenance,upcomingPickups,overdueReturns,scheduledUtilizationPct,bookedValue},pickups:[],returns:[],tasks:[]}`; ranges/metric labels explicit |
| POST `/api/ai/booking-proposals` | `{inquiry:'...',clarifications?:{startDate,endDate,category,transmission}}` → proposal below; no DB writes |
| POST `/api/ai/insights` | `{from,to}` → `{source:'gemini'|'local',generatedAt,metrics:[...],recommendations:[...]}`; computation read-only |

VehicleDTO includes defined vehicle fields + `currency`. ReservationDTO includes defined reservation fields + `vehicle:{id,brand,model,licensePlate}`, `contact:{id,firstName,lastName}`, `currency`. Never return passwords, all tenant users, or unrelated contacts. Contact picker uses existing contacts API; its legacy array response stays compatible.

Example booking flow (values illustrative contract examples, not claimed inventory):

```json
{
  "source": "gemini",
  "extracted": {"startDate":"2026-11-10","endDate":"2026-11-12","category":"COMPACT","transmission":"AUTOMATIC"},
  "missingFields": [],
  "questions": [],
  "offers": [{"vehicleId":"<owned-uuid>","brand":"Dacia","model":"Sandero","dailyRate":"45.00","billedDays":2,"total":"90.00","currency":"EUR"}],
  "requiresHumanConfirmation": true,
  "checkedAt": "2026-11-07T18:00:00Z"
}
```

The frontend lets the operator select a real contact and offer, review dates/price, then explicitly submit POST `/api/reservations`. `confirmed:true` is a workflow requirement, not proof of security by itself; only authenticated authorized operators can write. Recheck inventory and current price at confirmation. If rate changed return 409 PRICE_CHANGED with refreshed quote; require fresh review. If vehicle taken return 409 BOOKING_CONFLICT and refresh alternatives. No automatic external message, email, payment, or reservation creation.

## 5. AI architecture

### Booking Copilot

1. Authenticate, cap inquiry (e.g. 2,000 chars), per-tenant rate budget and 12-second timeout. Pass operating date/timezone and allowlisted enums to server-side Gemini. Treat inquiry as untrusted data, not instructions.
2. Request structured JSON for **intent only**: nullable startDate/endDate/category/transmission. Provider output cannot set IDs, rates, totals, SQL, company or status. Validate parsed object, types/enums/dates/limits server-side; reject extra fields. Never execute generated code or SQL.
3. Resolve relative dates only when unambiguous under operating date/timezone. Missing/ambiguous dates become missingFields + deterministic clarification questions. Apply explicitly validated operator clarifications over extraction. Dates are mandatory; category/transmission optional filters. Do not fabricate a time, duration, contact, or category.
4. Query tenant-owned real inventory via the shared availability service, including operational status and overdue blocking. Compute rate/days/total in code. Compose offer labels and prices with deterministic templates. If no matches return empty offers and a factual “no matching vehicles” message.
5. Render extracted fields as editable review inputs and real offers. Never ask Gemini to write factual offer prose; labels and amounts come from DTOs. Human selects/creates existing contact, confirms through normal reservation API. Proposal endpoint has no write tool.

Fallback: `{source:'local',extracted:{...validated operator fields},missingFields:[...],questions:[...],offers:[],requiresHumanConfirmation:true}` until required dates are supplied. Show “AI unavailable — manual assisted search”. Once dates exist, run exactly the same real availability and pricing services. Do not pretend a heuristic extraction is Gemini. Timeout, missing key, quota, malformed JSON or invalid intent all enter labeled fallback; DB errors remain errors, never fabricated empty inventory.

### Revenue Leak Radar

Backend owns all metrics and severity thresholds; Gemini explains verified findings only:

| Indicator | Exact P0 definition | Real action |
| --- | --- | --- |
| Overdue returns | IN_PROGRESS reservations with endDate <= operating today; overdueDays = calendar difference from endDate to today (due today explicitly labeled) | Open owned reservation, show linked contact; manually confirm return or add follow-up task |
| Low scheduled utilization | Last 30 completed calendar days [today-30,today); numerator = sum of clipped planned reservation days in CONFIRMED/IN_PROGRESS/COMPLETED; denominator per vehicle = days in that window since vehicle createdAt operating date, at least 0; ratio null if denominator 0; low if <30% and >=7 eligible days | Open vehicle + reservations or prepare offer; add optional task |
| Expiring insurance | Date < today expired; today through today+30 inclusive expiring; null explicitly “not recorded”, not “valid” | Open vehicle insurance field or create renewal task |

Utilization is **scheduled** utilization, not actual physical use: no actual pickup/return timestamps, maintenance history, or reservation modification history exist. Surface this label and denominator. Completed early returns still retain planned dates. Include current MAINTENANCE/INACTIVE vehicles in historical denominator because historical state is unknown; flag this limitation. Do not silently exclude historically owned vehicles. Aggregate utilization = summed booked days / summed eligible days, not average of percentages.

`outNow` = IN_PROGRESS count, including overdue; `availableToday` uses availability for [today,today+1). Pickups = CONFIRMED starting today; returns = IN_PROGRESS ending today, with overdue shown separately. `bookedValue` = sum agreedTotal for non-cancelled reservations whose startDate lies in requested range; label “booking value, not collected revenue”. Do not prorate or infer collected money. Metrics include window, computedAt, formula/version and entity IDs; amounts in exact decimal strings.

Generate deterministic findings first: `{id,type,severity,entityType,entityId,metricIds,action:{label,href}}`. Send only necessary metric/finding values to Gemini, excluding contact PII, plates and freeform notes. Request `{findingId,recommendationCode}` where code is a fixed enum (CONTACT_CUSTOMER, REVIEW_AVAILABILITY, RENEW_INSURANCE). Validate IDs and mapping to allowed finding actions. Render localized, understandable recommendation templates using **backend metrics**. Do not display arbitrary model-generated financial claims/numbers/URLs. This keeps inventory/pricing/metrics factual; a short optional explanation must also be chosen from validated templates. No invented “€ lost” estimate. Low utilization is an opportunity signal, not proven loss.

AI unavailable: same metrics/findings/actions with `source:'local'` and visible “Local rules — AI unavailable”. Generate tasks only after operator click using existing task API; task is company-wide plain text, not a fictional deep link or new automation. Do not let Gemini choose URLs or execute actions. Add fake-provider unit tests for valid/invalid JSON, prompt injection, missing dates, timeouts and fallback; never spend API quota in automated tests.

Official references informing the design: [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output?lang=rest) explicitly requires application validation; [Prisma transaction reference](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions) describes transaction isolation and P2034 retries. Check against installed Prisma 5 and the target MySQL using the dedicated integration tests; do not upgrade ORM to match newer docs.

## 6. Frontend scope

Keep Flowdesck name, typography, dark navigation, green active state, Lucide icons, existing panels/cards, table/form/modal styling and responsive behavior. Existing components are primarily page-local markup; reusable **patterns/CSS**, not a prebuilt component library. Extract only small pieces needed by new pages.

| View / route | Minimal content and reuse |
| --- | --- |
| Fleet Dashboard `/dashboard` | Repurpose existing Dashboard.jsx cards for fleet stats, today pickups/returns, alerts and booking value; keep task UI; replace generic sales pipeline, use new fleet API. Keep old CRM summary API available. |
| Vehicles `/vehicles` | List/filter status/category, add/edit modal, daily rate, insurance date; reuse Contacts table/modal patterns, existing panel/buttons. No photo uploads or maintenance history. |
| Reservations `/reservations` | Date-filtered list, vehicle/contact selectors, create/review form, conflict feedback, start/return/cancel controls; start with list, not a calendar library. |
| AI Booking Copilot `/copilot` | Inquiry textarea, missing-field form, verified offer cards, select contact, explicit booking confirmation. Visible Gemini/local mode. |
| AI Insights `/insights` | Deterministic indicators, verified recommendation cards + links to `/vehicles?vehicleId=...` or `/reservations?reservationId=...`; target pages must implement these filters/detail opening. |

Workspace navigation: Dashboard, Vehicles, Reservations, AI Copilot, AI Insights, Clients, Settings; preserve Invoices in secondary navigation. Keep `/contacts` URL but relabel “Clients”. No new tasks page needed; existing dashboard task functionality remains. Add all new SPA paths to Express allowlist. All views need loading, empty, error, 401, forbidden-write and conflict states; do not show zero metrics on failed fetch. Preserve login/register and backend validation as authority. No broad landing-page redesign; a small positioning-copy update is P1.

## 7. Exact Phase 2 file plan

All paths below relative to clone root. New paths are intentional planned files; they do not exist yet.

| File(s) | Owner / change |
| --- | --- |
| `crm-saas/backend/prisma/schema.prisma` | A: additive models/enums/reverse relations/indexes only |
| `crm-saas/backend/prisma/migrations/<timestamp>_rental_foundation/migration.sql` (+ migration_lock.toml if adopting migrate) | A: generate/review only after disposable DB and migration-history decision; no deployment in this phase |
| `crm-saas/backend/src/middleware/permission.middleware.js` | A: implement tenant-local requireRoles; wire new writes |
| `crm-saas/backend/src/middleware/validation.middleware.js` | A: add rental field validation without changing legacy contact/invoice contracts |
| `crm-saas/backend/src/lib/rental-dates.js`, `rental-money.js` | A: date-only parsing/calendar arithmetic and exact decimal serialization |
| `crm-saas/backend/src/modules/vehicles/vehicles.routes.js`, `vehicles.controller.js`, `vehicles.service.js` | A: owned list/create/update, operational status and shared vehicle-lock protocol |
| `crm-saas/backend/src/modules/reservations/reservations.routes.js`, `reservations.controller.js`, `reservations.service.js` | A: availability, transactional writes, transitions, stale edits, overlap/overdue checks |
| `crm-saas/backend/src/modules/fleet/fleet.routes.js`, `fleet.controller.js`, `fleet.metrics.js` | A: shared verified dashboard/Radar computations |
| `crm-saas/backend/src/modules/ai/ai.routes.js`, `booking.service.js`, `insights.service.js`, `gemini.client.js` | A: server-only validated extraction/classification + deterministic fallback |
| `crm-saas/backend/src/app.js` | A: mount new APIs; new production SPA routes, preserve old routes |
| `crm-saas/backend/src/modules/contacts/contacts.controller.js` | A: reservation-reference deletion conflict 409; tenant-aware mutation predicates where touched |
| `crm-saas/backend/.env.example`, `crm-saas/backend/README.md`, `crm-saas/README.md` | A: optional GEMINI_MODEL, date/currency policy, exact cwd/env/test instructions; no secrets |
| `crm-saas/backend/scripts/seed-rental-demo.js` | A: separate guarded/idempotent rental seed; no change to TermoFix seed |
| `crm-saas/backend/test/rental-domain.test.js`, `ai.test.js` | A: DB-free dates/money/metric/fake provider tests; add separate safe unit-test script |
| `crm-saas/backend/test/rentals.integration.test.js`, `backend.test.js` | A: dedicated DB tenant/role/locking/adjacency/state regression tests; cleanup reservation→vehicle/contact→company; ensure fixture ownership |
| `crm-saas/backend/package.json`, `crm-saas/package-lock.json` | A: only justified test/validation dependencies/scripts; retain Prisma 5; avoid unrelated dependency churn |
| `crm-saas/frontend/src/lib/api.js` | B: shared Axios base/auth/error/401 handling; no client-side Gemini key |
| `crm-saas/frontend/src/App.jsx`, `Workspace.jsx` | B: rental routes/nav, secondary invoices, preserve auth layout |
| `crm-saas/frontend/src/pages/Dashboard.jsx`, `Dashboard.css` | B: fleet dashboard, task UI preserved; distinguish error vs zero |
| `crm-saas/frontend/src/pages/vehicles/Vehicles.jsx`, `Vehicles.css` | B: vehicle forms/list/deep-link filter |
| `crm-saas/frontend/src/pages/reservations/Reservations.jsx`, `Reservations.css` | B: availability/create/confirm/status workflow and deep-link filter |
| `crm-saas/frontend/src/pages/ai/BookingCopilot.jsx`, `Insights.jsx`, `AI.css` | B: reviewed proposals, labeled fallback, verified action links |
| `crm-saas/frontend/src/workspace.css` | B: narrow layout additions only |
| `crm-saas/frontend/src/pages/contacts/Contacts.jsx` | B: optional picker reuse and backend `eroare`/409 feedback; retain CRUD |
| `docs/RENTACAR_PIVOT_PLAN.md`, `HANDOFF.md` | Both: record final behavior and actual checks |

P1 optional fixes: `frontend/package.json` + new ESLint config and workspace lock for an intentional lint setup; `frontend/src/index.css` + PostCSS config for verified Tailwind repair; `Settings.jsx` safe stored-user parsing. Defer Prisma config/package cleanup, legacy money conversion, generic CRM role-policy migration and broad auth refactors until separately tested.

## 8. One-day execution and division of work

Developer A owns backend/schema/tests; Developer B owns frontend. Agree the contracts, date-only policy, roles, statuses and money strings first; B can build against clearly labeled fixture DTOs while A delivers APIs. Never present fixture offers as live inventory. A alone owns workspace lockfile edits to avoid merge conflicts. Both use isolated branches/worktrees in Phase 2; Phase 1 local branch contains only documentation.

| Time box | Developer A | Developer B | Integration gate |
| --- | --- | --- | --- |
| 0–45 min | Confirm disposable MySQL target; validate schema/migration; publish DTO fixtures | Confirm existing visual patterns; API helper + routes/nav | Agreed contracts and DB safety |
| 45 min–3 h | Vehicle CRUD + reservation locks/availability/roles | Vehicles + reservations forms/list | Create booking; adjacent accepted, overlap rejected |
| 3–5 h | Concurrency/tenant tests; fleet metrics + deterministic insight API | Fleet dashboard, insights/action links, task preservation | Two tenants; correct metrics from seeded records |
| 5–6.5 h | Gemini client, validated copilot; local mode always works | Copilot review + confirmation UX | Live availability, no AI booking writes |
| Final 1.5 h | Dedicated demo seed + integration checks | Responsive/manual flow + production-path refresh checks locally | Rehearse complete demo, document results |

**P0:** tenant/role checks; date/money validation; transactional double-book prevention; fleet/reservation CRUD subset; real inventory copilot + explicit confirmation; deterministic Radar with the three indicators; fleet dashboard; labeled fallback; existing contacts/tasks retained; isolated demo seed and smoke/concurrency tests. Optional live Gemini narration must not delay a trustworthy local workflow.

**P1:** richer Gemini recommendation prose only with factual controls; actual return timestamps/time-of-day rentals; expense analytics; multi-currency/timezone settings; exports; full calendar UI; attachments; messages/payments; audit log/idempotency; team invitations/billing; broad lint/dependency/CSS cleanup. On retry after an uncertain create response, reload bookings before resubmission; P0 lock prevents overlapping duplicates, but a durable idempotency key is P1.

Cut scope before cutting correctness. If time tight, keep one reservations list/form, two statuses via start/return controls, and deterministic Radar. Do not replace concurrency tests with UI-only checks. Do not promise collection/profit metrics without source data.

## 9. Demo acceptance criteria

1. Two isolated demo companies; 5–10 owned vehicles each with decimal rates, real client contacts, tasks and reservations around operating today. Include one low-utilization vehicle, one IN_PROGRESS overdue return and insurance expiring within 30 days. Synthetic seed is clearly labeled, targets only the approved demo DB and avoids credential logging beyond intentional local seed output.
2. Login and existing client/task flows still work; no working invoice feature removed. VIEWER can read but cannot mutate rentals, including direct API calls. Another company's IDs return 404; no tenant appears in proposals/metrics.
3. New vehicle validates plate uniqueness within tenant, enums, rate and insurance date; malformed date and negative money return 400.
4. [10th,12th) + [12th,14th) succeeds; intersecting booking returns 409; cancelled record releases capacity. Independent concurrent requests for the same free interval produce one success and one conflict. Edits and start/return transitions use the same locks. MAINTENANCE/INACTIVE and unreturned overdue cars are not offered.
5. Inquiry with missing dates requests clarification. Complete inquiry yields only DB-backed offers, exact daily rate × calendar days, selected client and visible human confirmation. Proposal request creates zero reservations; confirmation creates exactly one after revalidation. A stale price/inventory conflict refreshes offers.
6. Dashboard and Radar agree on fixture-derived figures, window/timezone/currency; booked value is not cash revenue. Overdue return, low scheduled utilization and expiring insurance link to the correct vehicle/reservation; task creation needs an explicit click.
7. Missing key, timeout, quota or invalid AI JSON shows labeled local/manual mode with the same verified availability/metrics. No fake inventory, freeform financial claims or external automated action.
8. Frontend production build passes; isolated rental/CRM integration tests pass; new production deep links work in a local production-mode smoke. No public deployment required by this phase. Record actual results, not expected results.

## 10. Risks and exact next step

Primary blocker: no configured MySQL/JWT/key here, so DB-backed behavior and live Gemini remain unverified. Other risks: no migration baseline, short schedule, ORM config version mismatch, missing write-role policies, CSS/lint setup, six dependency advisories, hardcoded model, working-directory dotenv assumptions and production route allowlist.

**Recommended next step (Phase 2, not executed):** Developer A configures an explicitly disposable MySQL database and runs existing CRM integration tests against it, then implements/validates the additive schema and shared vehicle-lock booking service with concurrency tests. In parallel Developer B implements the agreed DTO API helper, vehicle/reservations screens and navigation using labeled fixtures until endpoints are available. Start with the booking correctness gate before AI polish. No production schema or infrastructure action is authorized by this plan.

## Phase 2 execution note — 2026-11-08

Fleet/booking implementation and isolated verification are recorded in [PHASE2_IMPLEMENTATION.md](PHASE2_IMPLEMENTATION.md); this original plan is otherwise preserved. Rental models/APIs/UI, demo seed and concurrency tests are implemented. AI features are deferred per the Phase 2 request. Additive migration and legacy baseline require explicit history reconciliation before any existing-environment deployment. Optional owned reservationId supports edit quoting; GET vehicle detail and availability/status aliases were added. Vehicle DELETE deliberately returns 405 with archive guidance, retaining this plan's history-preserving policy. No production change was performed.
