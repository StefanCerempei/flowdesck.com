# Phase 4 · Fleet Intelligence and local demo

Implemented 8 November 2026. Branch feat/rentacar-pivot-foundation. No schema migration required.

## Demo login

Open http://127.0.0.1:5063/login and use **demo@flowdesck.test**. Open the local file `crm-saas/backend/.env.demo-login.json` in an editor and copy its password into the login form. That file is gitignored with permissions 0600. It contains the generated password only on this computer. Never paste its contents into reports or commit it.

The account is SUPER_ADMIN for the existing **Timiș Rent Demo** company. Its database contains exactly 12 fictional vehicles, 12 customers, 22 reservations and the three existing operational tasks. The older demo user is retained. No other company was changed. Login, all workspace routes, both fallback modes and data ownership were verified with this account.

At verification, the last-30-day view calculated 14 findings across 12 vehicles, with one HIGH finding. These comprise one return requiring follow-up, 12 low scheduled-utilization findings and one approaching insurance expiration. Counts change with operating date, criteria and user edits. The fleet contains ten operational vehicles, one in maintenance and one inactive. Low historical occupancy is intentional demo capacity. The existing date-relative seed already produces all three categories on the verification date, so no rental records were rewritten.

### Present the story

1. Open Dashboard and show the fleet metrics, Fleet Intelligence preview and tasks.
2. Open Fleet Intelligence with 30 days and the default 40% threshold. Review the overdue return, follow its reservation link and inspect the IN_PROGRESS state. The description concerns the recorded return status.
3. Compare the 7-day and 30-day scheduled utilization. Open a low-use vehicle and its reservation history. Discuss the maintenance-history limitation.
4. Open the insurance finding. Click Create reminder, then explicitly Confirm reminder. Open Dashboard tasks to see the saved item. Reopening Insights detects the same task title and disables repeated creation.
5. Click Generate AI Briefing. The current label is **Rule-based analysis — AI explanation unavailable.** Recommendations are generated from verified findings.
6. Open Booking Copilot. Paste a Romanian or English rental inquiry. The current label is **Manual assisted search**. Enter future pickup/return dates, desired preferences and optional total EUR budget in the review form, then Refresh offers. Select a vehicle and customer and explicitly confirm. View reservation opens the persisted booking. This adds a reservation to the demo dataset, so later counts will differ.

### Safe local password reset and restart

From the cloned repository's nested backend directory, with Node 22 available:

```bash
cd /home/mdsxn/Documents/ChatGPT/flowdesck/crm-saas/crm-saas/backend
export PATH=/tmp/flowdesck-node22/node-v22.23.4-linux-x64/bin:$PATH
NODE_ENV=development RENTAL_DEMO_CONFIRM=TIMIS_RENT_DEMO npm run demo:reset-password
```

Read the newly generated password from .env.demo-login.json. The reset verifies a loopback development/test/demo URL, the deterministic demo company ID/name and the target account's tenant. It changes only that demo user's password/role. Existing JWTs expire under the existing one-day policy. Reset does not invalidate all sessions.

`npm run demo:access` with the same environment verifies or creates the requested login, preserving a valid existing password. `npm run seed:rental-demo` preserves the existing tenant dataset. Fresh seed credentials for the older seed user now go to .env.seed-login.json, never console output. For a missing database, first follow Phase 2's disposable database setup. The runtime configuration created for this local database is in backend/.env, also ignored and mode 0600. Credentials and Node under /tmp may be ephemeral.

To restart the local production bundle after stopping the existing loopback preview, use:

```bash
NODE_ENV=production node --input-type=module -e "import app from './src/app.js'; app.listen(5063, '127.0.0.1')"
```

Build updates from the nested npm workspace with `npm run build`. The test MySQL container remains flowdesck-phase2-923a66 on loopback port 34343. Its identity was verified before database work.

## Deterministic rules

All analysis is tenant-scoped and independent of Gemini. Only selected vehicle fields and reservation IDs/status/dates enter the engine. Contacts, customer identities, amounts and notes are excluded.

- Return follow-up applies to IN_PROGRESS reservations with endDate strictly before the operating day. COMPLETED, CANCELLED, CONFIRMED and today's scheduled returns do not produce this alert. Severity is HIGH. actualReturnedAt is explicitly null because no such timestamp is stored.
- Scheduled utilization supports the last 7 or 30 completed local calendar days, using [from,today). Each vehicle's eligible window starts at the later of reporting start and its creation date in Europe/Bucharest. CONFIRMED, IN_PROGRESS and COMPLETED planned intervals are clipped to that window, sorted and merged. Adjacent and overlapping intervals are counted once. Occupied calendar days / eligible calendar days × 100 yields the percentage. Zero eligible days yields null. Low-utilization alerts require at least seven eligible days and an unrounded percentage below the configured threshold, default 40%. Below 20% severity is MEDIUM, otherwise LOW. Display rounds to two decimals.
- All currently owned operational statuses remain eligible because historical maintenance intervals are absent. The metric represents scheduled occupancy. There is no calculation of financial loss or legal document validity.
- Recorded insurance dates before today produce HIGH alerts. Dates from today through seven days are in the 7-day bucket, through 14 in the 14-day bucket, through 30 in the 30-day bucket. The first two buckets have MEDIUM severity, the last LOW. Missing dates produce no expiration claim.

IDs hash tenant, vehicle, reservation where relevant, type and reporting period. Findings sort by deterministic severity and ID. Evidence contains source dates, counted days, thresholds or recorded status. The dashboard preview calls this same engine with the default 30-day criteria.

The query fetches owned vehicles and only reservation intervals intersecting the historical window plus older open returns, in a RepeatableRead transaction. The pure calculation function is shared with the dashboard. Computation is adequate for the 5–30 vehicle MVP; it scans the returned reservation list per vehicle.

## APIs and model explanation

- GET /api/ai/fleet-insights accepts periodDays 7 or 30 and threshold 0–100. Response includes summary, reportingPeriod, utilization, insights, calculatedAt, limitations and source rules.
- POST /api/ai/fleet-insights/explain accepts periodDays, threshold and locale ro-RO/en-GB/en-US. It recomputes all facts server-side. Client-supplied metrics and tenant IDs are rejected.
- The explanation endpoint has a per-tenant, per-process budget of five calls/minute and Retry-After on 429.
- Responses use JWT authentication, no-store caching and the rental error boundary. No insights endpoint mutates reservations or tasks.
- The existing POST /api/tasks creates reminders after explicit confirmation. The UI disables in-flight requests, checks existing task titles and remembers confirmed results. Concurrent tabs can still create duplicate tasks because the legacy task schema has no unique action key.

Gemini receives verified summary, window and finding evidence with opaque IDs and allowed action codes. It selects up to three existing findings and their matching actions. Unknown IDs, duplicate selections, extra fields or wrong actions cause fallback. Backend Romanian/English templates render the selected recommendations, so the provider cannot introduce financial claims or change severity. This follows the Phase 1 bounded recommendation design. All evidence cards remain visible regardless of briefing selection.

The server uses GEMINI_API_KEY and optional GEMINI_MODEL, default gemini-3.1-flash-lite, with a 12-second timeout. Production source labels are gemini or rules. Tests inject a process-local provider labeled test. No request can select the test provider.

## Live Gemini release gate

No key is configured, so live extraction and explanation remain **unverified**. Configure a valid server-side GEMINI_API_KEY and, if needed, GEMINI_MODEL in backend/.env, then restart the local API. Run one Romanian and one English Copilot inquiry with explicit future dates and verify the Gemini extraction label and totals against Reservations. Run a Fleet Intelligence briefing and verify the Gemini-assisted briefing label, selected finding IDs and displayed evidence. If either feature falls back, live-AI demo readiness remains incomplete. Never add the key to frontend variables or share it in chat.

## Actual verification

All **45 backend tests** passed on the confirmed disposable MySQL database, including the earlier Copilot and concurrency cases. Added coverage includes clipping, adjacent/overlapping intervals, cancelled and returned exclusions, insurance buckets, local midnight, zero-age vehicles, empty fleet, stable IDs, query bounds, tenant boundaries, dashboard consistency, no customer fields, read-only explanation, invalid provider output, missing key and mocked provider timeout.

All **seven Chromium scenarios** passed. The new scenario logs in, opens Insights, generates a labeled fallback briefing, follows a vehicle link, verifies no task before confirmation, creates a reminder, verifies the stored task, reloads to check duplicate prevention and checks mobile overflow. Screenshots were visually inspected. The existing Copilot scenario still creates a booking after a real stale-price rejection. The full frontend build passed with existing CSS import-order warnings. ESLint remains absent from the existing setup.

A separate browser check logged in as demo@flowdesck.test and loaded Dashboard, Fleet, Reservations, Customers, Copilot, Insights, Invoices and Settings. Tasks remain part of Dashboard. The demo API count is 12/12/22. Login credential preparation was repeated with the same password preserved.

## Changed files

At clone root, added docs/PHASE4_FLEET_INTELLIGENCE.md and updated HANDOFF.md. Under the nested npm workspace:

- backend/src/modules/insights/insights.service.js, explanation.js, insights.routes.js
- backend/src/app.js and backend/src/modules/fleet/fleet.routes.js
- backend/scripts/demo-access.js and backend/scripts/seed-rental-demo.js
- backend/package.json
- backend/test/insights.test.js and backend/test/rentals.integration.test.js
- frontend/src/pages/ai/Insights.jsx
- frontend/src/App.jsx, frontend/src/Workspace.jsx, frontend/src/pages/Dashboard.jsx
- frontend/test/rental-ui.spec.js

Local ignored files are backend/.env and backend/.env.demo-login.json. No schema or lockfile change was needed in this phase.

Phase 5 can begin from this operational demo. Live Gemini verification remains the release gate for claiming live AI. Keep production migration/history review separate from this local demo.
