# Phase 2 — fleet and booking foundation

Completed locally on 2026-11-08 (Europe/Bucharest), on `feat/rentacar-pivot-foundation`. Phase 1 plan remains the design reference. No push, deployment, production connection, existing-data reset or existing-container removal was performed. Initial untracked Phase 1 documentation was preserved.

## What is implemented

- Vehicle list/read/create/update with normalized per-company unique license plate, positive Decimal daily rate, category/transmission/status validation, insurance date and company-wide operational-status counts. Operational AVAILABLE is distinct from date availability.
- Reservation list/read/create/date edit and explicit pickup/return/cancel transitions. CONFIRMED and IN_PROGRESS block [start,end) overlaps. Cancelled/completed records remain as history. An unreturned overdue IN_PROGRESS booking conservatively blocks future offers on its vehicle.
- Every reservation write and vehicle update locks the tenant-owned Vehicle row with parameterized SELECT FOR UPDATE in a ReadCommitted transaction. Reads/checks/writes use the same transaction; deadlocks are retried at most three times. Vehicle assignment is immutable after booking creation. No AI/provider work occurs inside transactions.
- Same-company composite foreign keys for vehicle and customer; company-specific queries; authenticated database roles control rental writes (ADMIN/SUPER_ADMIN only). VIEWER can read. Existing CRM write policies remain unchanged.
- Strict real calendar dates; Europe/Bucharest operating day; EUR; maximum 365 days. Date-only MySQL DATE values are serialized YYYY-MM-DD. Decimal arithmetic and two-decimal strings, server quote calculation, explicit API-only admin price override, stored historical agreedTotal and stale-quote 409.
- Frontend Fleet, Reservations and rental Dashboard use actual backend records. Customer CRUD and invoices remain accessible; tasks remain on the dashboard. Reservation date edits require a refreshed server quote and review confirmation. Native dialog provides focus containment and Escape handling.
- Separate fictional Timiș Rent Demo seed: 12 vehicles, 12 customers, 22 reservations, three tasks. Includes historical returns, active/overdue rentals, upcoming/cancelled bookings, maintenance/inactive vehicles, unused capacity, expiring insurance. Atomic, fixed IDs, no deletes/updates; reruns preserve existing data/credentials and original relative-date snapshot.
- AI Assistant page is explicitly coming soon. No new AI code, provider call, insights generation or client-side API key was added. Existing CRM briefing backend was preserved; it is not used by the new dashboard.

## Endpoints and contracts

All require Bearer JWT. New errors use `{error:{code,message}}` (existing authentication middleware retains its legacy error envelope). Money is a decimal string, currency EUR. List results `{items,nextCursor}` default 50/max 100; use returned UUID cursor. Sorting is by ID, not booking chronology; UI may sort for presentation. All query/body unknown fields are rejected.

| Endpoint | Details |
| --- | --- |
| GET `/api/vehicles` | status/category/search/cursor/limit; includes extra `summary:{total,AVAILABLE,MAINTENANCE,INACTIVE}` over all company vehicles, independent of filters |
| GET `/api/vehicles/:id` | Owned vehicle DTO |
| POST `/api/vehicles` | brand/model/licensePlate/category/transmission/dailyRate; optional status/insuranceExpiration |
| PATCH `/api/vehicles/:id` | Partial allowlist; no id/companyId; taking out of service blocked while active/upcoming commitments exist |
| DELETE `/api/vehicles/:id` | Deliberately 405 ARCHIVE_REQUIRED for owned vehicles; 404 for inaccessible IDs. Use PATCH status INACTIVE; never destroys history |
| GET `/api/reservations/availability` | Required startDate/endDate, optional category/transmission; server-derived offers, days, total, checkedAt; not a hold |
| GET `/api/vehicles/availability` | Compatibility alias of reservation availability; registered before /:id |
| GET `/api/reservations` | Optional from+to (intersection), status, vehicleId, reservationId, cursor, limit |
| GET `/api/reservations/:id` | Owned record, nested minimal vehicle/customer details, agreedTotal, billedDays |
| POST `/api/reservations` | vehicleId/contactId/startDate/endDate/confirmed:true; optional agreedTotal quote check and overridePrice:true; starts CONFIRMED; create response includes priceBreakdown |
| PATCH `/api/reservations/:id` | Date/price update or status transition; expectedUpdatedAt required; vehicleId/contactId/companyId immutable |
| PATCH `/api/reservations/:id/status` | Compatibility alias restricted to status + expectedUpdatedAt |
| GET `/api/fleet/dashboard` | Optional from+to (default today → today+30); fleet/rentals/available-today/upcoming counts, current returns, today pickups, recent/upcoming reservations, operational/insurance attention, tasks |

Availability accepts optional **reservationId** to quote a date edit: validates tenant ownership and CONFIRMED state, excludes that reservation alone from overlap checks, returns only its existing vehicle. This preflight never grants booking rights or bypasses the locked update check. Unchanged historical start of a confirmed reservation can be retained during an edit; newly supplied dates must be valid. Entirely elapsed periods must be amended before pickup.

Create example:

```json
{
  "vehicleId": "<owned vehicle UUID>",
  "contactId": "<owned contact UUID>",
  "startDate": "2026-11-10",
  "endDate": "2026-11-12",
  "agreedTotal": "65.00",
  "confirmed": true
}
```

Transitions: CONFIRMED → IN_PROGRESS/CANCELLED; IN_PROGRESS → COMPLETED. No future early pickup. No reactivation of completed/cancelled records. Only CONFIRMED dates/prices can change. expectedUpdatedAt prevents overwriting a stale edit; writes advance timestamps monotonically. Dates and price cannot change in the same request as a status transition. Admin overrides are explicit and validated; the frontend uses calculated quotes only. Frontend clears a stale/conflicting offer and requires another availability check.

Dashboard's availableToday covers `[today,today+1)` in Europe/Bucharest; active rentals counts IN_PROGRESS, including overdue. Upcoming bookings start on/after today and before requested `to`. The API additionally supplies bookedValue for non-cancelled bookings **starting** in the selected range; it is booking value, not collections, and is not displayed as revenue. Utilization/profit/AI metrics are omitted. Insurance attention is rule-based, not AI.

## Database and migration safety

Prisma 5.22/MySQL retained. New enums: VehicleStatus, Transmission, ReservationStatus. New tables: Vehicle and Reservation. Existing Company gains reverse relations; Contact gains reverse relation and `[tenantId,id]` unique index. Existing columns, IDs, invoices and data remain unchanged. New composite FKs enforce tenant consistency in SQL. Native checks enforce positive rates/totals and startDate < endDate. **MySQL 8.0.16+ with InnoDB is required for the shipped checks**; tested on 8.4.13. MariaDB compatibility is not claimed.

Migration files:

1. `0_legacy_baseline/migration.sql`: exact existing five-table schema, for empty databases or explicitly marking an already-matching existing schema.
2. `202611070001_rental_foundation/migration.sql`: additive tables/index/FKs/checks; no DROP, TRUNCATE, reset, old-column conversion or old-row deletion.

### New disposable development database

From the npm workspace `crm-saas/`, install using Node 22:

```bash
npm ci --include=dev
```

Create/configure an explicitly disposable local MySQL 8 database with credentials you control. Set DATABASE_URL and JWT_SECRET outside source control. From **`crm-saas/backend`** (loads backend/.env):

```bash
npm run db:generate
npm run db:deploy
npm run dev
```

Start Vite in a second terminal from `crm-saas/frontend` using `npm run dev`; it serves port 3000 and proxies /api to port 5000. If changing backend PORT, update the local proxy accordingly. Workspace-level commands do not automatically load backend/.env. No server startup automatically migrates or seeds data.

### Existing environment (instructions only; not executed against production)

1. Back up and verify restoration of the target DB. Confirm MySQL version, InnoDB, schema drift and existing migration history. Rehearse on a restored development copy first. Confirm Node 22/runtime env and build-time VITE_API_BASE_URL if separate origins.
2. If the environment already uses Prisma migration history, reconcile the newly introduced baseline with that history before running any deploy command. Do not blindly resolve or overwrite history.
3. If it has the exact original five-table schema and no migration history, compare it against the baseline (including FKs/collation) and inspect current rows. Only after confirming a match, mark the legacy baseline as applied, from backend cwd with the target environment explicitly supplied:

```bash
npx prisma migrate resolve --applied 0_legacy_baseline
```

4. Review additive rental SQL and apply only in the authorized deployment window with `npm run db:deploy`; never run migrate reset, migrate dev or db push on an existing production DB. Generate client and build frontend. Root production entry remains `npm start`; PORT/DATABASE_URL/JWT_SECRET must be injected there because backend/.env is not loaded from root by default.
5. Smoke health, login, tenant lists, create/adjacent/conflicting booking, CRM routes and new SPA refreshes. New /vehicles, /reservations and /copilot routes are included in Express's production allowlist. No seed in production. Avoid exposing Vite's development server publicly.
6. Rollback application code only with DB compatibility considered; do not drop rental tables/history to roll back. No automated rollback is supplied.

Actual baseline/existing-environment compatibility is **unverified**; the disposable upgrade test proves data preservation for the repository's original schema only.

### Demo seed

Use only a confirmed loopback local `*_dev`, `*_test` or `*_demo` database and non-production NODE_ENV:

```bash
# From backend, with DATABASE_URL already configured for that local target:
RENTAL_DEMO_CONFIRM=TIMIS_RENT_DEMO npm run seed:rental-demo
```

Optional DEMO_PASSWORD must be 12+ characters / at most 72 UTF-8 bytes. Otherwise the script generates one and prints the new credentials once. Keep output private. Fictional email: demo@timis-rent.example. Never automatically run this on deployment. Rerunning preserves booking dates rather than changing active reservations. Identity collisions abort without overwriting unrelated records.

## Final Phase 2 acceptance run · 8 November 2026

The existing implementation was retained. Updated `backend/src/lib/rental-money.js` and `backend/src/modules/reservations/reservations.service.js` to filter individual unrepresentable quotes using a decimal-safe daily rate ceiling for the requested duration. Direct booking still validates the total before writing. Updated `backend/src/modules/fleet/fleet.routes.js` so upcoming pickup counts start at the later of today and the selected window start. Updated `frontend/src/pages/reservations/Reservations.jsx` to clear human confirmation when the customer changes and discard offers on create or edit conflicts. These paths are relative to the nested npm workspace.

Two additional MySQL regression cases in `backend/test/rentals.integration.test.js` cover mixed-price long-period availability and future reporting boundaries. The Chromium booking scenario in `frontend/test/rental-ui.spec.js` now verifies customer reconfirmation. All **28 backend tests and 5 Chromium scenarios passed** against the verified local disposable database. Prisma client generation, schema validation, migration status, the production build and guarded demo seed replay passed. A separate database read confirmed the demo tenant’s 12 vehicles, 12 customers and 22 reservations. Lint still fails because ESLint is missing. This run updated these six source/test files, this report and the root handoff. No schema, migration, infrastructure or dependency change was required in this pass.

## Earlier implementation verification

- Clean workspace dependency install passed after adding @playwright/test 1.65.0 as a frontend dev dependency. Workspace lock changed only for that test tooling and npm metadata, not a framework upgrade.
- Prisma generation/validation passed. Both migrations deployed successfully to a newly created isolated MySQL 8.4.13 container; migration status is up to date. Vehicle/Reservation confirmed InnoDB.
- Separate `flowdesck_upgrade_test` database: original baseline initialized, sentinel Company/Contact/Invoice inserted, additive SQL applied, sentinel values verified unchanged.
- **26 backend tests passed:** 12 unchanged legacy CRM integration tests, 11 rental integration tests and three domain tests. Covers auth/roles, tenant ID attacks and composite FK rejection, vehicle CRUD/validation/duplicate/archive-only history, date/price validation, adjacent/overlapping bookings, cancellation, status/overdue handling, stale edits, concurrent creates and concurrent date edits. Two independent overlapping HTTP creates produced exactly one 201 and one 409. Concurrent colliding edits produced one 200 and one 409.
- **Five Chromium browser scenarios passed** against the locally running production bundle and real test MySQL: actual login, fleet empty/create/edit/details/search/duplicate feedback, booking/quote/confirmation/date-edit/cancel, competing stale offer 409, task creation/toggle, all new and existing workspace deep links, controlled API error/loading states, mobile navigation at 390×844 without document overflow. Screenshots were inspected for layout. This is Chromium-only; Firefox/WebKit are unverified.
- Demo seed executed twice: first created 12/12/22 records, second made no changes.
- Frontend production build passed (1,579 modules; JS 311.79 kB / gzip 96.61 kB). Pre-existing CSS import-order warnings remain.
- Lint **fails** because pre-existing ESLint dependency/config are absent. npm audit still reports 6 advisories (5 moderate, 1 high). No forced updates or unrelated lint/CSS/ORM refactor performed.

Repeat checks after configuring only a disposable TEST_DATABASE_URL:

```bash
# Backend cwd; TEST_DATABASE_URL must refer to a separately migrated disposable DB:
npm run test:unit           # no DB needed
npm run test:integration    # 25 DB-backed tests
npm test                   # 28 total

# Frontend cwd; start local production-mode API/bundle against that SAME test DB first:
npx playwright install chromium
TEST_DATABASE_URL='<confirmed disposable URL>' npm run test:e2e
# Optional RENTAL_E2E_BASE_URL defaults to http://127.0.0.1:5057.
```

E2E tests create one uniquely named company, verify API/DB fixture identity and clean only that company's records. They need local app and disposable DB configuration; they do not start a server or migrate it. The serial scenarios intentionally form one end-to-end flow. Never point test environment variables at production.

## Local artifacts from this session

The isolated container is `flowdesck-phase2-923a66`, loopback port 34343; no pre-existing container/volume was removed. Test DB: flowdesck_test; upgrade DB: flowdesck_upgrade_test. Generated credentials/JWT are in private `/tmp/flowdesck-phase2-db/config.json` and mysql.env; the once-generated demo credentials are in private demo-output.txt there. These are temporary, untracked and never embedded in source/docs. The local production-mode app runs at http://127.0.0.1:5057 against that isolated database, not production. Restart commands should read/inject the private configuration without printing it. Remove/stop only this task-created container when finished, explicitly; no automatic destructive cleanup was performed.

## Changes from Phase 1 scope

- AI Copilot, Radar and utilization implementation intentionally deferred per Phase 2 request; /copilot is a coming-soon page. No AI insights route was added.
- GET vehicle detail, vehicle availability alias and status-update alias added as requested. DELETE returns 405 with an archive instruction to retain Phase 1's no-hard-delete rule, even for vehicles without history.
- Availability has an optional owned reservationId for safe edit quoting; list DTOs include billedDays and fleet summaries. Native date inputs and list views, no calendar library.
- Added a legacy baseline plus additive migration and MySQL checks, backed by isolated migration tests. Baseline must be explicitly reconciled for an existing deployment.
- API supports explicit overridePrice; frontend deliberately uses server-computed offers. Vehicle/customer assignment changes require cancel-and-recreate.
- Shared rental styles/UI live in Rental.css and components/RentalUI.jsx rather than separate near-duplicate page styles. Existing Dashboard.css remains in use. Existing CRM brief endpoint is preserved.

## Limitations and Phase 3 next steps

All Phase 2 acceptance criteria were exercised locally; no real hosting/production migration, other browser engine or MariaDB compatibility is claimed. No automated billing, payments, deposits, expenses, actual pickup/return timestamps, maintenance history, durable idempotency keys or full audit log. Returned status confirms a human action without storing the actual return time. After uncertain booking response, reload bookings before retrying.

Do not call booking value collected revenue. No utilization/profit figure is displayed. Dashboard aggregates company history in memory; adequate for MVP scale but should later move to bounded/SQL aggregates. Existing localStorage auth and legacy role policies remain unchanged. Legacy lint/CSS warnings, dependency advisories and obsolete Prisma config require separate maintenance.

Phase 3 starts with a server-only booking-proposal module that extracts and validates intent, calls the **existing availability service**, and constructs factual offers from its DTOs. It must never write reservations. Reuse normal POST /api/reservations for explicit human confirmation and locked revalidation. Add fake-provider tests, tenant request budgets, timeout and explicitly labeled manual/local fallback before optional live Gemini testing. No Gemini key is required to run Phase 2.

## Exact file manifest

Paths relative to the cloned repository root. Phase 1 documents were already untracked and are updated, not discarded.

### Modified tracked files

- `crm-saas/README.md`
- `crm-saas/backend/.env.example`
- `crm-saas/backend/README.md`
- `crm-saas/backend/package.json`
- `crm-saas/backend/prisma/schema.prisma`
- `crm-saas/backend/src/app.js`
- `crm-saas/backend/src/middleware/permission.middleware.js`
- `crm-saas/backend/src/modules/contacts/contacts.controller.js`
- `crm-saas/frontend/package.json`
- `crm-saas/frontend/src/App.jsx`
- `crm-saas/frontend/src/Workspace.jsx`
- `crm-saas/frontend/src/pages/Dashboard.jsx`
- `crm-saas/frontend/src/pages/contacts/Contacts.jsx`
- `crm-saas/frontend/src/workspace.css`
- `crm-saas/package-lock.json`

### Created files / updated untracked Phase 1 documents

- `HANDOFF.md`
- `crm-saas/backend/prisma/migrations/0_legacy_baseline/migration.sql`
- `crm-saas/backend/prisma/migrations/202611070001_rental_foundation/migration.sql`
- `crm-saas/backend/prisma/migrations/migration_lock.toml`
- `crm-saas/backend/scripts/seed-rental-demo.js`
- `crm-saas/backend/src/lib/rental-dates.js`
- `crm-saas/backend/src/lib/rental-errors.js`
- `crm-saas/backend/src/lib/rental-money.js`
- `crm-saas/backend/src/lib/rental-transaction.js`
- `crm-saas/backend/src/lib/rental-validation.js`
- `crm-saas/backend/src/modules/fleet/fleet.routes.js`
- `crm-saas/backend/src/modules/reservations/reservations.routes.js`
- `crm-saas/backend/src/modules/reservations/reservations.service.js`
- `crm-saas/backend/src/modules/vehicles/vehicles.routes.js`
- `crm-saas/backend/src/modules/vehicles/vehicles.service.js`
- `crm-saas/backend/test/rental-domain.test.js`
- `crm-saas/backend/test/rentals.integration.test.js`
- `crm-saas/frontend/playwright.config.js`
- `crm-saas/frontend/src/components/RentalUI.jsx`
- `crm-saas/frontend/src/lib/api.js`
- `crm-saas/frontend/src/pages/Rental.css`
- `crm-saas/frontend/src/pages/ai/ComingSoon.jsx`
- `crm-saas/frontend/src/pages/reservations/Reservations.jsx`
- `crm-saas/frontend/src/pages/vehicles/Vehicles.jsx`
- `crm-saas/frontend/test/rental-ui.spec.js`
- `docs/PHASE2_IMPLEMENTATION.md`
- `docs/RENTACAR_PIVOT_PLAN.md`
