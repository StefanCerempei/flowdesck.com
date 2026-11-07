import { Prisma } from "@prisma/client";
import { invalid } from "./rental-errors.js";
export const MAX_BOOKING_TOTAL = "9999999999.99";

export function maxDailyRateForPeriod(days) {
  return new Prisma.Decimal(MAX_BOOKING_TOTAL).div(days).toDecimalPlaces(2, Prisma.Decimal.ROUND_DOWN);
}

export function money(value, max = "99999999.99") {
  if (typeof value !== "string" || !/^(0|[1-9]\d*)(\.\d{1,2})?$/.test(value))
    invalid(
      "Money must be a positive decimal string with at most two decimal places.",
    );
  const amount = new Prisma.Decimal(value);
  if (amount.lte(0) || amount.gt(max))
    invalid("Amount outside the allowed range.");
  return amount;
}
export const moneyString = (value) => new Prisma.Decimal(value).toFixed(2);
export const price = (rate, billedDays) =>
  moneyString(money(new Prisma.Decimal(rate).mul(billedDays).toFixed(2), MAX_BOOKING_TOTAL));
