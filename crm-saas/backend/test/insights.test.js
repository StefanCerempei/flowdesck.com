import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateInsights,
  criteria,
} from "../src/modules/insights/insights.service.js";
import {
  explainReport,
  explainProvider,
} from "../src/modules/insights/explanation.js";
const now = new Date("2026-11-08T12:00:00Z");
const vehicle = {
  id: "v",
  brand: "Demo",
  model: "Car",
  licensePlate: "TEST",
  status: "AVAILABLE",
  createdAt: new Date("2026-01-01"),
  insuranceExpiration: null,
};
const rental = (id, startDate, endDate, status = "COMPLETED") => ({
  id,
  vehicleId: "v",
  companyId: "c",
  startDate,
  endDate,
  status,
});
test("utilization clips, merges adjacent/overlapping intervals and excludes cancelled records", () => {
  const report = calculateInsights(
    "c",
    [vehicle],
    [
      rental("a", "2026-10-20", "2026-11-03"),
      rental("b", "2026-11-02", "2026-11-05"),
      rental("d", "2026-11-05", "2026-11-06"),
      rental("e", "2026-11-07", "2026-11-12"),
      rental("x", "2026-11-06", "2026-11-07", "CANCELLED"),
    ],
    { periodDays: 7 },
    now,
  );
  assert.equal(report.utilization[0].occupiedDays, 6);
  assert.equal(report.utilization[0].eligibleDays, 7);
  assert.equal(report.utilization[0].utilizationPercent, 85.71);
});
test("return follow-up excludes returned, cancelled and today's scheduled returns", () => {
  const report = calculateInsights(
    "c",
    [vehicle],
    [
      rental("a", "2026-11-01", "2026-11-07", "IN_PROGRESS"),
      rental("b", "2026-11-01", "2026-11-07"),
      rental("c", "2026-11-01", "2026-11-07", "CANCELLED"),
      rental("d", "2026-11-01", "2026-11-08", "IN_PROGRESS"),
    ],
    {},
    now,
  );
  const alerts = report.insights.filter((i) => i.type === "OVERDUE_RETURN");
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].severity, "HIGH");
  assert.equal(alerts[0].evidence.actualReturnedAt, null);
  assert.deepEqual(
    report,
    calculateInsights(
      "c",
      [vehicle],
      [
        rental("a", "2026-11-01", "2026-11-07", "IN_PROGRESS"),
        rental("b", "2026-11-01", "2026-11-07"),
        rental("c", "2026-11-01", "2026-11-07", "CANCELLED"),
        rental("d", "2026-11-01", "2026-11-08", "IN_PROGRESS"),
      ],
      {},
      now,
    ),
  );
});
test("insurance windows and missing dates have deterministic severity", () => {
  for (const [date, severity, window] of [
    ["2026-11-07", "HIGH", null],
    ["2026-11-15", "MEDIUM", 7],
    ["2026-11-22", "MEDIUM", 14],
    ["2026-12-08", "LOW", 30],
    ["2026-12-09", null, null],
    [null, null, null],
  ]) {
    const alerts = calculateInsights(
      "c",
      [{ ...vehicle, insuranceExpiration: date }],
      [],
      {},
      now,
    ).insights.filter((i) => i.type === "INSURANCE_EXPIRATION");
    assert.equal(alerts.length, severity ? 1 : 0);
    if (severity) {
      assert.equal(alerts[0].severity, severity);
      assert.equal(alerts[0].evidence.windowDays, window);
    }
  }
});
test("empty fleet, new vehicles, local midnight and query boundaries", () => {
  assert.deepEqual(calculateInsights("c", [], [], {}, now).insights, []);
  const r = calculateInsights(
    "c",
    [{ ...vehicle, createdAt: new Date("2026-11-07T23:30Z") }],
    [],
    {},
    now,
  );
  assert.equal(r.utilization[0].eligibleDays, 0);
  assert.equal(r.utilization[0].utilizationPercent, null);
  assert.equal(r.insights.length, 0);
  for (const q of [
    { periodDays: 8 },
    { companyId: "other" },
    { threshold: -1 },
    { threshold: 101 },
  ])
    assert.throws(() => criteria(q), { status: 400 });
});
test("explanation rejects invented metrics/IDs/actions and always preserves evidence", async () => {
  const report = calculateInsights("c", [vehicle], [], {}, now);
  for (const provider of [
    async () => "{",
    async () =>
      JSON.stringify({
        recommendations: [{ findingId: "fake", action: "REVIEW_RETURN" }],
      }),
    async () => {
      throw new DOMException("Timeout", "TimeoutError");
    },
  ]) {
    const r = await explainReport(report, "en-GB", provider);
    assert.equal(r.source, "rules");
    assert.match(r.label, /AI explanation unavailable/);
    assert.deepEqual(r.insights, report.insights);
  }
  const success = await explainReport(report, "ro-RO", async (payload) => {
    assert.ok(!JSON.stringify(payload).includes("TEST"));
    return JSON.stringify({
      recommendations: [
        { findingId: report.insights[0].id, action: "REVIEW_UTILIZATION" },
      ],
    });
  });
  assert.equal(success.source, "test");
  assert.match(success.recommendations[0].text, /Analizați/);
});
test("missing Gemini key and mocked transport timeout are labeled fallback", async (t) => {
  const old = process.env.GEMINI_API_KEY;
  t.after(() => {
    if (old === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = old;
  });
  const report = calculateInsights("c", [vehicle], [], {}, now);
  delete process.env.GEMINI_API_KEY;
  assert.equal((await explainReport(report, "en-GB")).source, "rules");
  process.env.GEMINI_API_KEY = "test";
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(options.signal);
    throw new DOMException("Timeout", "TimeoutError");
  });
  assert.equal(
    (await explainReport(report, "en-GB", explainProvider)).source,
    "rules",
  );
});
