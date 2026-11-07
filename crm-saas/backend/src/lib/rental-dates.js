import { invalid } from "./rental-errors.js";
export const TIMEZONE = "Europe/Bucharest";
export const DAY = 86400000;
export function today(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (key) => parts.find((p) => p.type === key).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export const dateString = (date) =>
  date instanceof Date ? date.toISOString().slice(0, 10) : date;
export function parseDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    invalid("Dates must use YYYY-MM-DD.");
  const date = new Date(value + "T00:00:00.000Z");
  if (
    !Number.isFinite(date.getTime()) ||
    dateString(date) !== value ||
    value < "2000-01-01" ||
    value > "2100-12-31"
  )
    invalid("Invalid calendar date (supported years: 2000–2100).");
  return date;
}
export const addDays = (value, days) =>
  dateString(new Date(parseDate(dateString(value)).getTime() + days * DAY));
export function period(startDate, endDate) {
  const start = parseDate(startDate),
    end = parseDate(endDate),
    billedDays = (end - start) / DAY;
  if (billedDays <= 0 || billedDays > 365)
    invalid(
      "End date must follow start date; maximum rental period is 365 days.",
    );
  return { startDate: start, endDate: end, billedDays };
}
