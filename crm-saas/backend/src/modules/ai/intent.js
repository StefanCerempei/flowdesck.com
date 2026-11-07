import { addDays, parseDate } from "../../lib/rental-dates.js";
import {
  CATEGORIES,
  TRANSMISSIONS,
  choice,
  object,
  text,
} from "../../lib/rental-validation.js";
import {
  MAX_BOOKING_TOTAL,
  money,
  moneyString,
} from "../../lib/rental-money.js";
import { invalid } from "../../lib/rental-errors.js";

export const fields = [
  "startDate",
  "endDate",
  "preferredBrand",
  "preferredModel",
  "category",
  "transmission",
  "maxTotalBudget",
  "currency",
  "pickupLocation",
];
export const emptyIntent = () =>
  Object.fromEntries(fields.map((key) => [key, null]));
export const providerKeys = [
  "isRental",
  "pickupText",
  "returnText",
  ...fields.slice(2),
];
export const fold = (value) =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
const months = [
  "january ianuarie",
  "february februarie",
  "march martie",
  "april aprilie",
  "may mai",
  "june iunie",
  "july iulie",
  "august",
  "september septembrie",
  "october octombrie",
  "november noiembrie",
  "december decembrie",
];
const weekdays = [
  "sunday duminica",
  "monday luni",
  "tuesday marti",
  "wednesday miercuri",
  "thursday joi",
  "friday vineri",
  "saturday sambata",
];

export function cleanFields(input) {
  object(input, fields);
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null) out[key] = null;
    else if (key === "category") out[key] = choice(value, CATEGORIES);
    else if (key === "transmission") out[key] = choice(value, TRANSMISSIONS);
    else if (key === "currency") {
      if (typeof value !== "string" || !/^[A-Z]{3}$/.test(value))
        invalid("Invalid currency.");
      out[key] = value;
    } else if (key === "maxTotalBudget")
      out[key] = moneyString(money(value, MAX_BOOKING_TOTAL));
    else if (key.endsWith("Date")) {
      parseDate(value);
      out[key] = value;
    } else out[key] = text(value, 80);
  }
  return out;
}
function namedDate(s) {
  const match =
    s.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/) ||
    (() => {
      const m = s.match(/^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
      return m && [m[0], m[2], m[1], m[3]];
    })();
  if (!match) return null;
  const month =
    months.findIndex((names) => names.split(" ").includes(match[2])) + 1;
  return month ? { day: match[1], month, year: match[3] } : null;
}
function resolveDate(s, reference, shared) {
  if (!s) return null;
  if (/^\d{4}-\d\d-\d\d$/.test(s)) return s;
  if (["today", "azi", "astazi"].includes(s)) return reference;
  if (["tomorrow", "maine"].includes(s)) return addDays(reference, 1);
  const weekday = s
    .replace(/^(next |urmatoarea |urmatorul )/, "")
    .replace(/ (viitoare|viitor)$/, "");
  const index = weekdays.findIndex((names) =>
    names.split(" ").includes(weekday),
  );
  if (index >= 0)
    return addDays(
      reference,
      (index - parseDate(reference).getUTCDay() + 7) % 7 || 7,
    );
  const parts =
    namedDate(s) || (/^\d{1,2}$/.test(s) && shared && { ...shared, day: s });
  if (!parts) return null;
  const suffix =
    "-" +
    String(parts.month).padStart(2, "0") +
    "-" +
    parts.day.padStart(2, "0");
  let year = Number(parts.year || reference.slice(0, 4));
  if (!parts.year && year + suffix < reference) year++;
  return year + suffix;
}
export function decode(raw, inquiry, day) {
  const data = JSON.parse(raw);
  object(data, providerKeys);
  if (
    !providerKeys.every((k) => Object.hasOwn(data, k)) ||
    typeof data.isRental !== "boolean"
  )
    invalid("Invalid extraction.");
  const { isRental, pickupText, returnText, ...preferences } = data;
  const intent = { ...emptyIntent(), ...cleanFields(preferences) };
  const message = fold(inquiry);
  function evidence(value) {
    if (value === null) return "";
    const snippet = fold(text(value, 80));
    if (!message.includes(snippet)) invalid("Ungrounded date expression.");
    return snippet;
  }
  const pickup = evidence(pickupText);
  let dropoff = evidence(returnText);
  // The same words cannot serve as evidence for both sides of a rental.
  if (pickup && dropoff && !message.replace(pickup, "").includes(dropoff))
    dropoff = "";
  function checkedDate(expression, shared) {
    const resolved = resolveDate(expression, day, shared);
    if (!resolved) return null;
    try {
      parseDate(resolved);
      return resolved;
    } catch {
      return null;
    }
  }
  intent.startDate = checkedDate(pickup, namedDate(dropoff));
  if (dropoff && dropoff !== pickup) {
    const duration = dropoff.match(
      /^(?:for |pentru )?(\d{1,3}) (?:days?|zile|zi)$/,
    );
    intent.endDate =
      duration && intent.startDate
        ? addDays(intent.startDate, Number(duration[1]))
        : checkedDate(dropoff, namedDate(pickup));
  }
  return { isRental, intent };
}
