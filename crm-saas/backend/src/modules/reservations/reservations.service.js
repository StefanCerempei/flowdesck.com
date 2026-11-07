import { prisma } from "../../lib/prisma.js";
import { withVehicleLock } from "../../lib/rental-transaction.js";
import { conflict, invalid, notFound } from "../../lib/rental-errors.js";
import {
  dateString,
  parseDate,
  period,
  today,
} from "../../lib/rental-dates.js";
import { MAX_BOOKING_TOTAL, maxDailyRateForPeriod, money, moneyString, price } from "../../lib/rental-money.js";
import {
  object,
  uuid,
  choice,
  STATUSES,
  CATEGORIES,
  TRANSMISSIONS,
} from "../../lib/rental-validation.js";
import { vehicleDTO } from "../vehicles/vehicles.service.js";
export const includeReservation = {
  vehicle: {
    select: { id: true, brand: true, model: true, licensePlate: true },
  },
  contact: { select: { id: true, firstName: true, lastName: true } },
};
export const reservationDTO = (r) => ({
  ...r,
  startDate: dateString(r.startDate),
  endDate: dateString(r.endDate),
  agreedTotal: moneyString(r.agreedTotal),
  billedDays: period(dateString(r.startDate), dateString(r.endDate)).billedDays,
  currency: "EUR",
});
export function blockingWhere(companyId, dates, excludeId) {
  return {
    companyId,
    ...(excludeId ? { id: { not: excludeId } } : {}),
    OR: [
      {
        status: { in: ["CONFIRMED", "IN_PROGRESS"] },
        startDate: { lt: dates.endDate },
        endDate: { gt: dates.startDate },
      },
      { status: "IN_PROGRESS", endDate: { lte: parseDate(today()) } },
    ],
  };
}
export async function availability(companyId, query) {
  object(query, [
    "startDate",
    "endDate",
    "category",
    "transmission",
    "reservationId",
  ]);
  const dates = period(query.startDate, query.endDate);
  const editing = query.reservationId
    ? await getReservation(companyId, uuid(query.reservationId))
    : null;
  if (
    query.startDate < today() &&
    (!editing || query.startDate !== dateString(editing.startDate))
  )
    invalid("Availability start date cannot be in the past.");
  if (editing && editing.status !== "CONFIRMED")
    conflict("INVALID_STATE", "Only confirmed bookings can be edited.");
  const vehicles = await prisma.vehicle.findMany({
    where: {
      companyId,
      status: "AVAILABLE",
      dailyRate: { lte: maxDailyRateForPeriod(dates.billedDays) },
      ...(editing ? { id: editing.vehicleId } : {}),
      ...(query.category
        ? { category: choice(query.category, CATEGORIES) }
        : {}),
      ...(query.transmission
        ? { transmission: choice(query.transmission, TRANSMISSIONS) }
        : {}),
      reservations: { none: blockingWhere(companyId, dates, editing?.id) },
    },
    orderBy: { licensePlate: "asc" },
  });
  return {
    startDate: query.startDate,
    endDate: query.endDate,
    billedDays: dates.billedDays,
    currency: "EUR",
    items: vehicles.map((v) => ({
      vehicle: vehicleDTO(v),
      total: price(v.dailyRate, dates.billedDays),
    })),
    checkedAt: new Date().toISOString(),
  };
}
export async function getReservation(companyId, id, db = prisma) {
  const result = await db.reservation.findFirst({
    where: { companyId, id },
    include: includeReservation,
  });
  if (!result) notFound();
  return result;
}
async function ensureBookable(tx, companyId, vehicle, dates, excludeId) {
  if (vehicle.status !== "AVAILABLE")
    conflict("VEHICLE_UNAVAILABLE", "Vehicle is inactive or in maintenance.");
  if (
    await tx.reservation.findFirst({
      where: {
        ...blockingWhere(companyId, dates, excludeId),
        vehicleId: vehicle.id,
      },
    })
  )
    conflict(
      "BOOKING_CONFLICT",
      "Vehicle is already booked for this period or has an unreturned overdue rental.",
    );
}
function agreedPrice(body, vehicle, dates) {
  const calculated = price(vehicle.dailyRate, dates.billedDays);
  if (
    body.overridePrice !== undefined &&
    typeof body.overridePrice !== "boolean"
  )
    invalid("overridePrice must be boolean.");
  const agreed =
    body.agreedTotal === undefined
      ? calculated
      : moneyString(money(body.agreedTotal, MAX_BOOKING_TOTAL));
  if (agreed !== calculated && body.overridePrice !== true)
    conflict(
      "PRICE_CHANGED",
      `Current total is EUR ${calculated}. Review the current offer or explicitly agree an override.`,
    );
  return agreed;
}
export async function createReservation(companyId, body) {
  object(body, [
    "vehicleId",
    "contactId",
    "startDate",
    "endDate",
    "agreedTotal",
    "confirmed",
    "overridePrice",
  ]);
  uuid(body.vehicleId);
  uuid(body.contactId);
  if (body.confirmed !== true) invalid("Human confirmation is required.");
  const dates = period(body.startDate, body.endDate);
  if (body.startDate < today())
    invalid("New reservations cannot start in the past.");
  return withVehicleLock(companyId, body.vehicleId, async (tx, vehicle) => {
    if (
      !(await tx.contact.findFirst({
        where: { id: body.contactId, tenantId: companyId },
      }))
    )
      notFound();
    await ensureBookable(tx, companyId, vehicle, dates);
    const result = await tx.reservation.create({
      data: {
        companyId,
        vehicleId: vehicle.id,
        contactId: body.contactId,
        startDate: dates.startDate,
        endDate: dates.endDate,
        agreedTotal: agreedPrice(body, vehicle, dates),
        status: "CONFIRMED",
      },
      include: includeReservation,
    });
    return {
      ...reservationDTO(result),
      priceBreakdown: {
        dailyRate: moneyString(vehicle.dailyRate),
        billedDays: dates.billedDays,
        calculatedTotal: price(vehicle.dailyRate, dates.billedDays),
        agreedTotal: moneyString(result.agreedTotal),
        currency: "EUR",
      },
    };
  });
}
export async function updateReservation(companyId, id, body) {
  object(body, [
    "startDate",
    "endDate",
    "agreedTotal",
    "overridePrice",
    "status",
    "expectedUpdatedAt",
  ]);
  if (
    typeof body.expectedUpdatedAt !== "string" ||
    !Number.isFinite(Date.parse(body.expectedUpdatedAt))
  )
    invalid("expectedUpdatedAt is required.");
  if (!Object.keys(body).some((k) => k !== "expectedUpdatedAt"))
    invalid("Supply an update.");
  const initial = await getReservation(companyId, id);
  return withVehicleLock(companyId, initial.vehicleId, async (tx, vehicle) => {
    const existing = await getReservation(companyId, id, tx);
    if (existing.updatedAt.toISOString() !== body.expectedUpdatedAt)
      conflict("STALE_EDIT", "Reservation changed. Reload before editing.");
    if (body.status !== undefined) {
      if (
        Object.keys(body).some(
          (k) => !["status", "expectedUpdatedAt"].includes(k),
        )
      )
        invalid("Change status separately from dates or price.");
      choice(body.status, STATUSES);
      const transitions = {
        CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
        IN_PROGRESS: ["COMPLETED"],
      };
      if (!transitions[existing.status]?.includes(body.status))
        conflict(
          "INVALID_TRANSITION",
          "This status transition is not allowed.",
        );
      if (body.status === "IN_PROGRESS") {
        if (dateString(existing.endDate) <= today())
          conflict(
            "EXPIRED_PERIOD",
            "Update the expired rental period before pickup.",
          );
        if (dateString(existing.startDate) > today())
          conflict("EARLY_PICKUP", "Rental cannot start before its start day.");
        await ensureBookable(tx, companyId, vehicle, existing, id);
      }
      return reservationDTO(
        await tx.reservation.update({
          where: { id, companyId },
          data: {
            status: body.status,
            updatedAt: new Date(
              Math.max(Date.now(), existing.updatedAt.getTime() + 1),
            ),
          },
          include: includeReservation,
        }),
      );
    }
    if (existing.status !== "CONFIRMED")
      conflict("INVALID_STATE", "Only confirmed reservations can be edited.");
    for (const key of ["startDate", "endDate"])
      if (body[key] !== undefined) parseDate(body[key]);
    const start = body.startDate ?? dateString(existing.startDate),
      end = body.endDate ?? dateString(existing.endDate),
      dates = period(start, end);
    if (start < today() && start !== dateString(existing.startDate))
      invalid("Changed start date cannot be in the past.");
    await ensureBookable(tx, companyId, vehicle, dates, id);
    const total = agreedPrice(body, vehicle, dates);
    return reservationDTO(
      await tx.reservation.update({
        where: { id, companyId },
        data: {
          startDate: dates.startDate,
          endDate: dates.endDate,
          agreedTotal: total,
          updatedAt: new Date(
            Math.max(Date.now(), existing.updatedAt.getTime() + 1),
          ),
        },
        include: includeReservation,
      }),
    );
  });
}
