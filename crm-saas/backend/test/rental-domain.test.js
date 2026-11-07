import { test } from "node:test";
import assert from "node:assert/strict";
import { period, today, addDays } from "../src/lib/rental-dates.js";
import { price, money } from "../src/lib/rental-money.js";
import { vehicleBody } from "../src/lib/rental-validation.js";
test("date-only billing ignores DST and enforces genuine [start,end) dates", () => {
  assert.equal(period("2026-03-28", "2026-03-30").billedDays, 2);
  assert.equal(period("2026-10-24", "2026-10-26").billedDays, 2);
  for (const dates of [
    ["2026-02-30", "2026-03-03"],
    ["2026-11-10", "2026-11-10"],
    ["2026-11-12", "2026-11-10"],
    ["2026-01-01", "2028-01-01"],
  ])
    assert.throws(() => period(...dates));
  assert.equal(today(new Date("2026-11-07T23:30:00Z")), "2026-11-08");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});
test("decimal-safe price and bounded monetary strings", () => {
  assert.equal(price(money("32.50"), 3), "97.50");
  assert.equal(price(money("0.10"), 3), "0.30");
  assert.throws(() => price(money("99999999.99"), 365));
  for (const x of [12, "-1", "0", "NaN", "1.001", "1e2", "999999999.99"])
    assert.throws(() => money(x));
});
test("vehicle input allowlist and normalized plate", () => {
  assert.equal(
    vehicleBody({
      brand: "Dacia",
      model: "Sandero",
      licensePlate: " tm-01 abc ",
      category: "ECONOMY",
      transmission: "MANUAL",
      dailyRate: "35.00",
    }).licensePlate,
    "TM01ABC",
  );
  assert.throws(() => vehicleBody({ companyId: "other" }, true));
  assert.throws(() => vehicleBody({ status: "RENTED" }, true));
  assert.throws(() => vehicleBody({}, true));
});
