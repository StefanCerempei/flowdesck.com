# Backend development

Use Node.js 22 and MySQL / MariaDB. From `crm-saas`, install the workspaces with `npm ci`.
Copy `backend/.env.example` to `backend/.env`, then set `DATABASE_URL` and a random `JWT_SECRET`.

From `crm-saas/backend`:

```bash
npm run db:generate
npm run db:push
npm run dev
```

Both `npm start` and the legacy `node index.js` start the same API. Missing database or JWT configuration prevents startup.
The development frontend runs at `http://localhost:3000`; CORS also permits port 5173 and the existing production domains.

## Integration tests

Use a separate MySQL database, never the production database. Initialize its schema explicitly before running tests:

```bash
DATABASE_URL='mysql://USER:PASSWORD@127.0.0.1:3307/flowdesk_test' npm run db:push
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

These changes do not add a payment timestamp, change floating-point money storage or define role-based write policies. Those require product and schema decisions.
