# Phase 3 · AI Booking Copilot

The protected workspace page `/copilot` turns a Romanian or English inquiry into a reviewed offer and an editable customer reply. Staff can copy the reply or explicitly book the vehicle for an existing customer. The company’s stored rentals and prices supply all commercial facts. This phase adds no tables or migrations.

## From inquiry to booking

1. The authenticated proposal route derives company identity from the existing JWT middleware. Each tenant gets 12 proposal requests per rolling-from-first-request minute, per server process. A 429 includes Retry-After.
2. A server-side Gemini REST request gets a system instruction and a separate JSON payload containing the inquiry, reply locale, current operating date and Europe/Bucharest timezone. Common email and phone patterns are masked. Free text can still contain personal information. The provider receives no directory, customer record, vehicle record, token, tenant ID, or database tool.
3. The provider returns intent data. Server validation rejects missing schema keys, unknown properties, invalid enums, overlong strings and invalid budget formats. Model-supplied dates must have corresponding text in the inquiry. The backend resolves ISO dates, Romanian/English named months, today/tomorrow, weekdays and explicit numeric day durations. A yearless month/day resolves to its next non-past occurrence. A weekday resolves to its next occurrence; review displayed dates with the customer if their convention differs. Unrecognized expressions such as a bare “weekend” require clarification.
4. Required dates must form a future-or-today half-open period of 1–365 calendar days. A missing return or unresolved budget currency produces questions and zero offers. A pickup location is a request for staff to verify separately. There is no location inventory in the rental schema.
5. The service calls Phase 2’s tenant-scoped `availability(companyId, query)`. That service owns status, overdue returns, overlapping intervals, price capacity and decimal calendar-day billing. The Copilot applies a hard EUR total-budget filter, then matches brand, model, category and transmission. If exact matches exist it returns those. Otherwise it ranks available alternatives by number of differing preferences and total price and discloses the differing fields. Customer replies use localized templates populated from verified offer values. Reply edits never change a quote.
6. Selecting an offer rechecks its vehicle and price and loads owned contacts. Changing the customer clears confirmation. Editing any search field clears selection, review and the old quote. The browser submits the reviewed vehicle, contact, dates, agreedTotal and confirmed flag through Phase 2’s existing POST /api/reservations. The backend enforces write roles and checks price and availability under its vehicle lock. A rejected quote clears the selection and shows the backend error. Refresh offers, select a new offer and confirm again. After an uncertain network response, inspect Reservations before retrying.

## API contract

`POST /api/ai/booking-proposals` accepts a bearer JWT. The body contains a 1–2,000 character `inquiry`, optional `locale` (ro-RO default, en-GB, en-US), optional `clarifications` and optional boolean `manual`. Manual mode skips the external call and uses reviewed form fields. Example:

```json
{"inquiry":"Do you have an automatic SUV next Friday for 3 days?","locale":"en-GB"}
```

The full provider schema requires boolean `isRental` and nullable strings `pickupText`, `returnText`, `preferredBrand`, `preferredModel`, `pickupLocation`, `category`, `transmission`, `maxTotalBudget` and `currency`. Categories and transmission use Phase 2 enums. The first two strings are verbatim evidence for dates or duration. The public `extracted` object and operator clarifications use normalized `startDate` and `endDate` instead of those snippets. Budget amounts are bounded positive decimal strings. Non-EUR or unspecified currency accompanying a budget requires a reviewed EUR budget.

A 200 proposal returns `source`, `extracted`, `missingFields`, `clarificationQuestion`, `warnings`, `checkedAt`, `offers`, `replyDraft` and `requiresHumanConfirmation:true`. Each offer has vehicleId, brand, model, category, transmission, dailyRate, billedDays, total, currency, mismatches and its own replyDraft. `checkedAt:null` means no inventory lookup took place. A completed search with zero eligible cars has a timestamp and an empty offers array. No interpretation path writes a reservation.

Bad request fields return 400. Missing/invalid auth returns 401. The rate limit returns 429. Inventory failures return an error. Provider failures including missing key, timeout, quota, rejected schema and malformed JSON return a visibly labeled manual proposal, with operator fields editable. In manual mode staff must transfer all relevant preferences and dates from the inquiry. The production runtime supports `gemini` and `local`; injected test providers use `test`.

## Run the local demo

Use Node 22 and the nested npm workspace `crm-saas/` inside the clone. Supply the existing development DATABASE_URL and JWT_SECRET privately. For live Gemini set GEMINI_API_KEY in the backend environment, optionally override GEMINI_MODEL (default gemini-3.1-flash-lite), and restart the backend. No Vite-prefixed AI setting is used. The provider has a 12-second deadline. Access to the chosen model must be enabled for the configured key.

Start `npm run dev` separately from the backend and frontend directories, using Phase 2’s existing local MySQL setup and demo login. Open /copilot. The separate loopback preview started in this session is at http://127.0.0.1:5063/copilot with the disposable demo database. The preview currently runs in manual mode. Enter a sample inquiry and analyze. Without a key, review the dates, preferences and budget manually and click **Refresh offers**. Select a quoted car and a fictional customer, review the total and confirm. **View reservation** opens the saved record. Copying the reply does not contact the customer.

## Verification and scope

Using the confirmed loopback MySQL database, all **38 backend tests** and **6 Chromium scenarios** passed. The frontend production build passed with existing CSS import-order warnings. Run `npm test` from backend with a verified disposable TEST_DATABASE_URL. For Chromium, build the frontend, serve the production bundle and API locally against that same test database, then run `npm run test:e2e` from frontend with TEST_DATABASE_URL and RENTAL_E2E_BASE_URL. The Copilot browser scenario starts a separate loopback test app and injects its provider in memory. No runtime setting exposes this injection to requests.

Coverage includes Romanian/English extraction fixtures, shared-month dates, relative dates, absent/ambiguous returns, invalid periods, model/transmission preferences, prompt injection, unknown fields, non-EUR budgets, budget-safe alternatives, no inventory, provider timeout/failure and missing key. The tenant and database tests verify isolation, rate limits and unchanged reservation counts until human confirmation. The Chromium scenario verifies a real saved reservation after customer reconfirmation and a stale price rejection followed by requoting. The retained Phase 2 suite exercises simultaneous overlapping bookings.

Gemini transport and response parsing were tested with mocks. **Live Gemini extraction remains unverified** because no key was configured. Before a live-AI competition demo, run one synthetic Romanian and one English inquiry under the target account, verify the Gemini source label and dates, then check returned prices against Reservations. No browser engines beyond Chromium were exercised. Persistent conversation history, location availability, outbound messaging and Revenue Leak Radar are outside this phase. The in-process rate budget assumes a single app instance.

## Files

Paths below are relative to the nested npm workspace.

| Area | Files introduced or extended |
| --- | --- |
| Backend | `backend/src/modules/ai/ai.routes.js`, `booking.service.js`, `gemini.client.js`, `intent.js` (all in that module), `backend/src/app.js`, `backend/src/lib/rental-errors.js`, `backend/.env.example`, `backend/package.json` |
| Frontend | `frontend/src/pages/ai/BookingCopilot.jsx`, `frontend/src/pages/ai/Copilot.css`, `frontend/src/App.jsx`, `frontend/src/Workspace.jsx` |
| Tests | `backend/test/ai.test.js`, `backend/test/support/extraction.js`, `backend/test/rentals.integration.test.js`, `frontend/test/rental-ui.spec.js` |
| At clone root | `docs/PHASE3_AI_BOOKING_COPILOT.md`, `HANDOFF.md` |
