import { invalid } from "./rental-errors.js";
import { parseDate } from "./rental-dates.js";
import { money } from "./rental-money.js";
export const VEHICLE_STATUSES = ["AVAILABLE", "MAINTENANCE", "INACTIVE"];
export const STATUSES = ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
export const CATEGORIES = ["ECONOMY", "COMPACT", "SUV", "VAN"];
export const TRANSMISSIONS = ["MANUAL", "AUTOMATIC"];
export function object(value, allowed) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    invalid("Expected a JSON object.");
  if (Object.keys(value).some((k) => !allowed.includes(k)))
    invalid("Unknown or protected field supplied.");
  return value;
}
export function uuid(value) {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    invalid("Invalid resource identifier.");
  return value;
}
export function choice(value, choices) {
  if (!choices.includes(value))
    invalid("Invalid status, category or transmission.");
  return value;
}
export function text(value, max) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    invalid(`Text must contain 1–${max} characters.`);
  return value.trim();
}
export function vehicleBody(body, partial = false) {
  object(body, [
    "brand",
    "model",
    "licensePlate",
    "category",
    "transmission",
    "dailyRate",
    "status",
    "insuranceExpiration",
  ]);
  const result = {};
  for (const [key, max] of [
    ["brand", 80],
    ["model", 80],
    ["licensePlate", 32],
  ]) {
    if (!partial || body[key] !== undefined) result[key] = text(body[key], max);
  }
  if (result.licensePlate) {
    result.licensePlate = result.licensePlate
      .toUpperCase()
      .replace(/[\s-]/g, "");
    if (!/^[A-Z0-9]{2,32}$/.test(result.licensePlate))
      invalid("License plate must contain 2–32 letters/digits.");
  }
  for (const [key, choices] of [
    ["category", CATEGORIES],
    ["transmission", TRANSMISSIONS],
  ]) {
    if (!partial || body[key] !== undefined)
      result[key] = choice(body[key], choices);
  }
  if (!partial || body.dailyRate !== undefined)
    result.dailyRate = money(body.dailyRate);
  if (body.status !== undefined)
    result.status = choice(body.status, VEHICLE_STATUSES);
  if (body.insuranceExpiration !== undefined)
    result.insuranceExpiration =
      body.insuranceExpiration === null
        ? null
        : parseDate(body.insuranceExpiration);
  if (!Object.keys(result).length) invalid("Supply at least one field.");
  return result;
}
export function pagination(query) {
  const limit = query.limit === undefined ? 50 : Number(query.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    invalid("Limit must be between 1 and 100.");
  return {
    take: limit + 1,
    orderBy: { id: "asc" },
    ...(query.cursor
      ? { whereCursor: { id: { gt: uuid(query.cursor) } } }
      : {}),
  };
}
export function page(rows, take, serialize) {
  const more = rows.length === take;
  const items = more ? rows.slice(0, -1) : rows;
  return {
    items: items.map(serialize),
    nextCursor: more ? items.at(-1).id : null,
  };
}
