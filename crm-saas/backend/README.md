# Backend development

Use Node.js 22 and MySQL 8.0.16+ with InnoDB (rental constraints require enforced CHECK support). From `crm-saas`, install the workspaces with `npm ci`.
**Existing databases:** read [Phase 2 migration/baseline instructions](../../docs/PHASE2_IMPLEMENTATION.md) before any deploy command; the new baseline must not be blindly applied over existing tables. The commands below are for a confirmed empty development/test database.

Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL` and a random `JWT_SECRET`.

From `crm-saas/backend`:

```bash
npm run db:generate
npm run db:deploy
npm run dev
```

Both `npm start` and the legacy `node index.js` start the same API. Missing database or JWT configuration prevents startup.
The development frontend runs at `http://localhost:3000`; CORS also permits port 5173 and the existing production domains.

## Integration tests

Use a separate MySQL database, never the production database. Initialize its schema explicitly before running tests:

```bash
DATABASE_URL='mysql://USER:PASSWORD@127.0.0.1:3307/flowdesk_test' npm run db:deploy
TEST_DATABASE_URL='mysql://USER:PASSWORD@127.0.0.1:3307/flowdesk_test' npm test
```

Tests refuse to start without `TEST_DATABASE_URL`, create temporary companies and users, and delete only their own fixtures.
They cover authentication, invalid payloads, CORS, route registration, tenant isolation, contact updates, invoices and dashboard revenue.

## API behavior

- Invalid payloads return JSON with status 400. Registration requires a company name, valid email and an 8-character password (maximum 72 UTF-8 bytes, matching bcrypt's limit).
- Duplicate registration returns 409, including concurrent requests. Failed logins return 401.
- Protected routes require a Bearer token containing a user ID and company ID matching the current database record.
- Contact updates change only supplied fields. Optional fields can be cleared with `null` or an empty string.
- Invoice amounts must be positive finite numbers. Invoice contacts must belong to the caller's company.
- Monthly revenue counts paid invoices created in the current UTC month. The schema has no payment timestamp, so this is an approximation of cash collected during the month.

Legacy invoices retain their floating-point storage and role policies. New rental APIs use Decimal money and ADMIN/SUPER_ADMIN writes.

## Demo TermoFix
Run `node scripts/seed-demo.js` from this directory against the intended demo database. It creates a synthetic company with 32 days of records and prints its new account credentials once. Running it again leaves the account intact.
Configure GEMINI_API_KEY in the backend environment and restart the server for live Gemini briefings. The endpoint sends only four weekly totals and the overdue count. Without a key or when the provider is unavailable the UI labels the response as local.
For a frontend deployed on a separate origin, set VITE_API_BASE_URL to the backend origin before building. With a shared origin, route /api to Express.

## Rental foundation (Phase 2)

See [implementation and deployment guide](../../docs/PHASE2_IMPLEMENTATION.md) for all API contracts, date/price/state policies, tests, guarded Timiș Rent Demo seed and exact existing-database steps. `npm run test:unit` needs no DB; `npm run test:integration` and `npm test` require a confirmed disposable TEST_DATABASE_URL. From frontend, `npm run test:e2e` runs Chromium tests against a local app using that same disposable DB.

The new dashboard is rental-focused and does not invoke Gemini. `/copilot` is coming soon. Existing CRM briefing API and TermoFix seed are retained. Never run either seed automatically in production.
