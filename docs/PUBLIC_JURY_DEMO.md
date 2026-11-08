# Public jury demo

The QR target is https://flowdesck.com/demo. Access is disabled until an operator provisions the guest and enables the server flag.

## Operator setup

Use the backend directory on the operator machine. Inject the production DATABASE_URL through your existing secret mechanism. The CLI deliberately does not load .env. Look up and review the existing Timiș Rent Demo company ID before running these commands.

```bash
export PUBLIC_DEMO_COMPANY_ID='<reviewed existing demo company UUID>'
node scripts/provision-public-demo-guest.js --dry-run
```

After explicit operator approval, run once with the same database and company ID.

```bash
CONFIRM_PUBLIC_DEMO_GUEST=CREATE_READ_ONLY_GUEST_ON_u895273058_database   node scripts/provision-public-demo-guest.js --apply
```

The CLI checks SELECT DATABASE() against u895273058_database, the unique company name and existing SUPER_ADMIN owner demo@flowdesck.test. It refuses ID/email collisions. It creates jury-guest@flowdesck.test with role DEMO_GUEST in a transaction, hashes and discards a random password, and verifies the resulting identity. Password login is blocked for this identity. Repeated runs verify the existing guest without updates. No fixtures, migrations, resets or password reset functions are involved.

Following separate approval, configure Hostinger backend variables and restart the app.

- PUBLIC_DEMO_ENABLED=true
- PUBLIC_DEMO_COMPANY_ID=<the same reviewed company UUID>

Keep JWT_SECRET in the existing backend secret configuration. Setting PUBLIC_DEMO_ENABLED=false immediately denies both issuance and existing guest requests. Changing or removing the guest identity also invalidates access on the next request.

## Session and abuse controls

The public session endpoint issues a 15-minute HS256 JWT with a dedicated audience. Every authenticated request reloads the identity and verifies its role, ID, email, tenant and company name. Guest sessions live in browser sessionStorage. A private user's localStorage session survives entering and leaving the guest tour.

Session issuance permits 30 requests per minute per application process. Guest API access permits 300 approved requests per minute per process. These aggregate limits deliberately avoid trusting forwarded IP headers and apply collectively behind NAT. Multiple processes multiply these limits. Configure edge throttling if traffic requires distributed enforcement.

Guest Booking Copilot uses manual extraction, real availability and backend prices. Fleet Intelligence uses deterministic indicators and rule-based briefing. Both are explicitly labeled in the existing UI. Provider calls are disabled for guests regardless of the Gemini key or injected provider. Existing tenant limits of 12 proposals and 5 briefings per minute also apply. The legacy dashboard briefing is denied.

## Write-route audit

A global bearer authentication policy runs before API handlers and applies a closed guest allowlist. Unlisted paths and methods receive 403. The same policy also runs through route authentication. Only approved GET/HEAD operations and the two read-only POST analysis endpoints are allowed.

| Surface | Existing protection | Guest enforcement |
| --- | --- | --- |
| Vehicles create/update/delete | Administrator role and tenant scope | Denied |
| Reservations create/update/status | Administrator role, tenant scope and transactional checks | Denied |
| Customers create/update/delete | Authentication and tenant scope | Denied before validation/controller |
| Tasks create/toggle/delete | Authentication and tenant scope | Denied before validation/controller |
| Invoices create/delete | Authentication and tenant scope | Denied before validation/controller |
| Company settings update | Administrator role and tenant scope | Denied |
| Auth register/login with guest bearer | Public auth handlers | Denied |
| Dashboard brief | Authenticated provider call | Denied |
| Booking proposal / Fleet briefing | Authenticated read-only analysis | Manual/rules only, rate limited |

Regular-user permissions retain their existing semantics. The legacy modules allow ordinary authenticated users to write. Guest restrictions are independent of those legacy permissions. Guest reads derive the company exclusively from the validated database identity, never request tenant IDs. Private tenants remain inaccessible.

## Verification and production checks

Backend integration tests create disposable tenants and exercise all write methods, forged tenant claims, expiration, disablement, safe analysis and issuance limits. Browser tests exercise disabled entry, automatic mobile login, both languages, refresh, disabled legacy actions, server rejection and logout. Existing rental regressions cover confirmed booking, concurrency conflict, pricing and administrator workflows.

After approved provisioning and enablement, open /demo in a fresh browser, confirm the read-only banner and existing fictional records, then verify disabled Customers, Tasks, Invoices and Settings controls. Production provisioning and feature-flag changes require operator approval. Public availability alone does not verify provisioning.

Local verification completed with 46 backend tests and 12 Chromium scenarios passing, plus a successful frontend production build. Production activation remains an operator step.
