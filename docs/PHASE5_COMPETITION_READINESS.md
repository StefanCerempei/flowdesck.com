# Phase 5 · Competition readiness

Verified 8 November 2026 on feat/rentacar-pivot-foundation, using the disposable local MySQL database. Existing uncommitted work was preserved. No production mutation, push or deployment was performed.

## Readiness matrix

| Capability | Status | Evidence and limits |
| --- | --- | --- |
| Local demo and administrator login | VERIFIED | demo@flowdesck.test authenticated through the existing login API and browser. |
| Fleet, clients, reservations, pricing and tenant isolation | VERIFIED | Retained integration and browser tests passed, including adjacent periods, stale edits and simultaneous booking conflicts. |
| Romanian and English live Copilot | VERIFIED | Real Gemini responses extracted November 13–16, 2026, automatic transmission, Volkswagen and maximum EUR 200 total. Actual stored Golf rate EUR 49.50 × 3 days yielded EUR 148.50. Interpretation left reservation count unchanged. |
| Live Fleet Intelligence briefing | VERIFIED | Gemini selected existing findings and matching allowed actions. The server rendered English recommendations using validated templates. No model-generated money or altered severity was accepted. |
| Browser live booking and reminder | VERIFIED | Live Gemini source label observed, Ana Demo 1 selected, explicit confirmation saved the booking, and a confirmed insurance reminder appeared in Dashboard. |
| Manual/rule fallback | VERIFIED | Ordinary tests explicitly disabled the real key and exercised fallback labels and mocked failures. |
| Deterministic Insights and dashboard consistency | VERIFIED | 14 default findings, 1 HIGH, on restored 12-vehicle fixture. |
| Scenario reset | VERIFIED | Added rehearsal reservation/task removed, original rows restored, authentication unchanged, unrelated tenant fingerprints unchanged. Repeated restore produced identical records. Also restored after the actual browser booking/reminder rehearsal. |
| Production build | VERIFIED | Vite production build passed. Existing CSS import ordering warnings remain. |
| Public HTTPS availability | VERIFIED | Read-only HEAD request to flowdesck.com returned HTTP 200. This does not establish deployment parity. |
| Hosting controls, production schema/history, backup and rollback rehearsal | UNVERIFIED | Repository wrapper comments reference Hostinger; actual account/process/runtime settings and database history are unavailable. |
| Production release | BLOCKED | Requires infrastructure inspection, backup/restore proof, migration reconciliation, staging rehearsal and explicit approval. |
| Lint | BLOCKED | Existing project lacks ESLint dependency/config. |
| Firefox/WebKit and multi-instance rate limiting | UNVERIFIED | Browser verification used Chromium. Budgets are in process memory. |

## Access and demo state

Open http://127.0.0.1:5063/login. Email is **demo@flowdesck.test**. Read the password directly from the existing gitignored `crm-saas/backend/.env.demo-login.json` locally. Do not paste it into documentation, chat, shell arguments or screen recordings.

The demo is restored to **12 vehicles, 12 fictional customers, 22 reservations and 3 tasks**. The default 30-day/40% report calculates **14 insights**, including one HIGH return follow-up. All three alert categories are present. Counts evolve with the operating date or operator changes. The saved checkpoint retains its original dates, so recheck them on the actual presentation day.

The live preview was restarted with the current backend environment. Reload any browser tabs that still show previous results. Tasks remain on Dashboard. Invoices remain available in secondary navigation. Settings navigation now uses the product label “Settings”.

## Three-minute walkthrough for two founders

Founder A narrates the customer problem and business value. Founder B operates the browser and explains the confirmations. Start logged in on Dashboard. Rehearse once after a scenario restore. Use a 1440-pixel desktop viewport and keep the inquiry in a local text editor.

| Time | Presenter and action | Suggested words |
| --- | --- | --- |
| 0:00–0:20 | A introduces Dashboard while B points at fleet/activity cards | “An independent rental company has to coordinate vehicles, booking inquiries and return follow-up. Flowdesck brings those daily tasks into one workspace.” |
| 0:20–0:35 | B opens Booking Copilot and pastes the English inquiry below | “Here is an ordinary customer request. Gemini extracts the rental details for an employee to review.” |
| 0:35–1:05 | B clicks Analyze inquiry, shows Gemini extraction, dates, transmission and budget, then scrolls to the offer | “Availability comes from our company’s stored bookings. The price is calculated from the vehicle’s configured rate.” Show EUR 49.50 × 3 = EUR 148.50 on the restored scenario. |
| 1:05–1:30 | B selects the Golf and Ana Demo 1, reviews price, checks confirmation and saves. Open View reservation | “The employee confirms the booking. The server checks availability again while locking the vehicle, so competing bookings cannot overlap.” |
| 1:30–2:05 | A narrates while B opens AI Fleet Insights and shows the three categories | “A scheduled return needs follow-up, some vehicles have low scheduled utilization, and an insurance date is approaching. These indicators are calculated from records.” |
| 2:05–2:30 | B generates briefing and shows Gemini-assisted label; then opens insurance reminder confirmation | “Gemini helps select recommendations from these verified findings. Staff decide what action to take.” |
| 2:30–2:45 | B confirms reminder and clicks Open tasks | “The reminder is now a saved task for the team.” |
| 2:45–3:00 | A closes while Dashboard remains visible | “Flowdesck helps rental teams process inquiries, reduce repetitive administration and see operational issues in time to act. Our next step is validating this workflow with independent rental companies.” |

English inquiry used in the verified recording:

> I would like an automatic Volkswagen from November 13, 2026 to November 16, 2026, with a maximum total budget of 200 EUR.

Romanian alternative verified against the provider:

> Bună ziua, aș dori o mașină automată între 13 și 16 noiembrie 2026, preferabil Volkswagen, cu un buget maxim de 200 EUR.

These are rehearsal dates, not universal example availability. If presenting after November 13, choose a future three-day interval, check availability first and adapt the script. After a rehearsal, restore before repeating the same request.

Avoid measured savings, legal-validity claims, speculative financial loss and customer testimonials. Explain low utilization as scheduled occupancy. If asked about actual late returns, explain that the alert means the scheduled date passed with no return confirmation recorded.

## Live Gemini configuration and verification

The current real key is configured privately. A model metadata request returned HTTP 200 for **models/gemini-3.1-flash-lite**, with generateContent supported. The existing v1beta generateContent endpoint, x-goog-api-key header, systemInstruction, responseMimeType and responseSchema request succeeded in actual provider calls. Both extraction and explanation retain a 12-second timeout. Extraction output limit is 1,400 tokens; briefing limit is 1,000.

Google documents this model and the structured response fields. Account-level compatibility was additionally tested with the configured key. [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) · [GenerateContent API reference](https://ai.google.dev/api/generate-content)

For a new machine, edit the backend's private .env using a local editor. Set GEMINI_API_KEY to your own real key and optionally GEMINI_MODEL. Never use VITE_ for credentials. Keep .env permissions at 0600 and restart the backend. From the backend directory run:

```bash
npm run ai:verify-live
```

This read-only script verifies model access, two synthetic bilingual inquiries, matching database prices, a real briefing and unchanged booking count. It fails on fallback and prints no provider bodies or credentials. Its dates are operating today +5 through +8 days; it requires the local disposable *_test database and demo account. Inventory changes can make this preflight fail and should be investigated.

Automated regressions must remain deterministic. Supply an empty GEMINI_API_KEY explicitly when running them so dotenv cannot load the real key. The browser tests use a process-local deterministic provider for the Copilot scenario and verify fallback for Insights. A mocked provider is never represented as live Gemini.

## Safe scenario restoration

The old seed is idempotent and preserves changes. It therefore cannot remove rehearsal bookings or tasks. A dedicated local checkpoint/restore command was added.

The private, gitignored backend/.env.demo-scenario.json checkpoint contains only the demo vehicle, contact, reservation and task rows. It contains no authentication credentials. Capture requires the original 12/12/22 counts and refuses to overwrite an existing checkpoint.

Before restoring, finish or close active demo forms and stop the local preview to avoid concurrent edits. From the nested backend directory:

```bash
export PATH=/tmp/flowdesck-node22/node-v22.23.4-linux-x64/bin:$PATH
NODE_ENV=development RENTAL_DEMO_CONFIRM=TIMIS_RENT_DEMO DEMO_SCENARIO_CONFIRM=RESTORE_TIMIS_DEMO npm run demo:restore
```

Restore is intentionally destructive only to rehearsal changes in the dedicated demo tenant. It checks the loopback development/test/demo database, deterministic tenant ID/name and every checkpoint row's tenant. It refuses a tenant containing invoices. It restores the four tables atomically in a serializable transaction, retaining company and users. Wrong confirmation or a transaction error aborts the operation. Do not repurpose this command for production.

Restart the local preview, log in and verify 12 vehicles, 12 customers, 22 reservations, three tasks, and the three insight categories. The automated verification compared all original rows and authentication, all unrelated tenants, and a second restore. The live browser rehearsal was restored afterward as well.

The checkpoint was already captured. On another approved disposable setup, after seeding and verifying the original scenario, capture once with the same confirmations and `npm run demo:capture`. Do not overwrite an established checkpoint just to make a changed scenario pass.

Password reset remains separate: `NODE_ENV=development RENTAL_DEMO_CONFIRM=TIMIS_RENT_DEMO npm run demo:reset-password`. Read the new password locally from the existing ignored login file. Existing tokens follow the one-day JWT lifetime.

## Local runbook and outage backup

The local preview is currently running on loopback port 5063. Node 22.23.4 is available under /tmp/flowdesck-node22/node-v22.23.4-linux-x64/bin. MySQL is the existing rootless Podman container flowdesck-phase2-923a66, port 34343. Preserve its volume. Check `podman ps`; if this known container is stopped, use `podman start flowdesck-phase2-923a66`.

From the clone root, build if source changed:

```bash
export PATH=/tmp/flowdesck-node22/node-v22.23.4-linux-x64/bin:$PATH
npm run build --prefix crm-saas
cd crm-saas/backend
NODE_ENV=production node --input-type=module -e "import app from './src/app.js'; app.listen(5063, '127.0.0.1')"
```

Run the server in a terminal you can stop with Ctrl+C. An occupied port means the previous preview may still be running. Check its owner before restarting. backend/.env loads from backend cwd. Root production start instead needs injected environment variables.

- Internet or Gemini outage: allow the timeout to return its labeled fallback. Say, “The AI provider is unavailable for this request. We can still review the dates manually and use the same availability and booking checks.” Enter dates/preferences and Refresh offers.
- Insights fallback: say, “These operational indicators are computed from our records. The optional AI recommendation service is unavailable, so this is the rule-based view.”
- Public hosting problem: use the local loopback application with the local MySQL database.
- Local application failure: use the screenshots or short prerecorded walkthrough below. State that it is a recording from a verified rehearsal. Do not describe it as a current live call.

Backup assets in docs/demo-assets are dashboard.png, fleet.png, copilot-live.png, reservation-saved.png, insights-live.png, task-saved.png and live-rehearsal.webm. The recording contains real Gemini responses and real confirmed actions from the rehearsal, uses fictional demo data, omits login entry, has no narration and runs for approximately 13 seconds. Use it as backup evidence, with the three-minute script as the spoken presentation. The recording includes the fixture changes that were subsequently restored.

## Regression and security results

- 45 backend tests passed against the confirmed disposable database.
- Seven Chromium scenarios passed, covering real database booking/price conflicts, tenant boundaries, login, vehicle forms, customers, tasks, Copilot, Insights, loading/error states and mobile navigation.
- Production build passed. CSS import-order warnings were reviewed and left for a focused styling maintenance task. Broad Tailwind configuration changes are unsuitable immediately before the presentation.
- Live smoke independently verified two languages and briefing; the production-mode browser preview completed the full live flow.
- Screenshots and mobile layout were inspected. Navigation “Configurare SaaS” became “Settings” to remove prominent generic CRM terminology.
- Scanning tracked files found zero Gemini key patterns. Frontend source contains no GEMINI_API_KEY reference. Runtime, login and checkpoint files are gitignored and private.
- JWT middleware reloads tenant/role. Rental write roles and server-owned company filters remain enforced. AI has no database write tool. Human confirmation remains required for booking and reminders.
- Interpretation and briefing have tenant budgets and timeouts. Unknown provider fields/actions/IDs fall back. Endpoint output exposes no stack traces.
- Production-only dependency audit reports two moderate React Router advisories, zero high/critical. Suggested npm remediation is a major version change, deferred pending compatibility work.
- Existing limitations include localStorage tokens, no distributed rate budget, no login throttling, legacy CRM write-role policy, and possible duplicate reminder creation from concurrent tabs. These are broader public-release concerns. There are no new debug endpoints or automatic seed/reset hooks.

## Exact deployment gate

Source indicates a same-origin Node/Express server serving the built Vite SPA and /api. The root entry comments mention Hostinger, but account-level hosting, process management, proxy settings and environment injection remain unverified. Public HTTPS returns 200; that does not prove this branch is deployed.

1. Identify the actual hosting account, process entry, Node version, deploy directory, start command, PORT injection and reverse proxy. Confirm authorized deployment access. Require Node 22 and MySQL 8.0.16+ with InnoDB for current checks.
2. Obtain a production database backup and prove restoration into an isolated environment. Inventory current schema, data, collation and _prisma_migrations before running any schema operation.
3. Compare with 0_legacy_baseline and the additive rental migration. If the exact original schema exists with no history, plan resolving the baseline as applied. If history differs, reconcile it explicitly. Do not blindly mark or replay migrations.
4. Rehearse the chosen migration path on the restored staging copy. Verify existing contacts/invoices, tenant relations, constraints, concurrency and recovery behavior.
5. Supply DATABASE_URL, JWT_SECRET, NODE_ENV=production and PORT through server configuration. Supply GEMINI_API_KEY and optional GEMINI_MODEL privately. Use the same reviewed lockfile. From clone root, npm run build installs nested workspace dependencies and builds the frontend; generate Prisma Client as part of the reviewed install/build procedure.
6. Same-origin deployment uses relative /api and no VITE_API_BASE_URL. A separate frontend origin requires a build-time API URL and intentional CORS configuration. Current allowlist includes the apex/www production domains and development ports 3000/5173.
7. Confirm TLS termination, HTTP-to-HTTPS redirect, certificate renewal, proxy headers and the correct public origin. Verify all SPA deep links including /copilot and /insights through Express's allowlist.
8. Obtain explicit approval for production migration and release after reviewing the backup, rehearsal and exact commands. Only then run the reconciled migration deployment and approved application startup. No production credentials or hosting details are available here to supply account-specific commands.
9. Smoke-test health, login, owned fleet/contacts, booking creation/edit/cancel, adjacent/overlapping reservations, Insights, reminders and live Gemini source labels. Health alone does not check the database.
10. Have the previous compatible application artifact and tested recovery plan ready. Preserve rental history. Do not use demo seed or checkpoint restoration against production.

## Files changed in Phase 5

Added backend/scripts/demo-scenario.js and backend/scripts/verify-live-ai.js. Updated backend/package.json with explicit maintenance commands and frontend/src/Workspace.jsx with Settings label. Added this document, docs/demo-assets and an updated root HANDOFF.md. Paths for application files are relative to the nested crm-saas workspace.

The private checkpoint is local and ignored. Existing user application changes, credentials, migrations and lockfiles were preserved. This phase adds no product modules or schema changes.
