import { createHash } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import {
  today,
  addDays,
  parseDate,
  dateString,
  DAY,
  TIMEZONE,
} from "../../lib/rental-dates.js";
import { object } from "../../lib/rental-validation.js";
import { invalid } from "../../lib/rental-errors.js";

export function criteria(input) {
  object(input, ["periodDays", "threshold"]);
  const periodDays = Number(input.periodDays ?? 30);
  const threshold = Number(input.threshold ?? 40);
  if (
    ![7, 30].includes(periodDays) ||
    !Number.isFinite(threshold) ||
    threshold < 0 ||
    threshold > 100 ||
    input.threshold === ""
  )
    invalid("Use periodDays 7 or 30 and a threshold between 0 and 100.");
  return { periodDays, threshold };
}
export function calculateInsights(
  companyId,
  vehicles,
  reservations,
  options = {},
  now = new Date(),
) {
  const { periodDays, threshold } = criteria(options);
  const day = today(now),
    from = addDays(day, -periodDays),
    calculatedAt = now.toISOString();
  const insights = [],
    utilization = [];
  const days = (a, b) => (parseDate(b) - parseDate(a)) / DAY;
  function add(
    vehicle,
    type,
    severity,
    title,
    description,
    evidence,
    reservationId = null,
  ) {
    const id = createHash("sha256")
      .update(
        JSON.stringify([companyId, vehicle.id, reservationId, type, from, day]),
      )
      .digest("hex")
      .slice(0, 32);
    insights.push({
      id,
      type,
      severity,
      title,
      description,
      vehicleId: vehicle.id,
      vehicle: {
        brand: vehicle.brand,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        status: vehicle.status,
      },
      reservationId,
      evidence,
      calculatedAt,
      source: "rules",
      recommendedAction: reservationId
        ? {
            type: "VIEW_RESERVATION",
            href: "/reservations?reservationId=" + reservationId,
            label: "Review reservation",
          }
        : {
            type:
              type === "INSURANCE_EXPIRATION"
                ? "CREATE_REMINDER"
                : "VIEW_VEHICLE",
            href: "/vehicles?vehicleId=" + vehicle.id,
            label:
              type === "INSURANCE_EXPIRATION"
                ? "Create reminder"
                : "Review vehicle performance",
          },
    });
  }
  for (const vehicle of vehicles) {
    const owned = reservations.filter(
      (r) => r.vehicleId === vehicle.id && r.companyId === companyId,
    );
    for (const r of owned)
      if (r.status === "IN_PROGRESS" && dateString(r.endDate) < day)
        add(
          vehicle,
          "OVERDUE_RETURN",
          "HIGH",
          "Return needs follow-up",
          "Scheduled return has passed; return not recorded.",
          {
            scheduledReturn: dateString(r.endDate),
            daysPastScheduledReturn: days(dateString(r.endDate), day),
            reservationStatus: r.status,
            actualReturnedAt: null,
          },
          r.id,
        );
    const created = today(vehicle.createdAt),
      eligibleFrom = created > from ? created : from;
    const eligibleDays = Math.max(0, days(eligibleFrom, day));
    const intervals = owned
      .filter((r) =>
        ["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(r.status),
      )
      .map((r) => [
        dateString(r.startDate) > eligibleFrom
          ? dateString(r.startDate)
          : eligibleFrom,
        dateString(r.endDate) < day ? dateString(r.endDate) : day,
      ])
      .filter(([a, b]) => a < b)
      .sort(([a], [b]) => a.localeCompare(b));
    let occupiedDays = 0,
      end = eligibleFrom;
    for (const [a, b] of intervals) {
      const start = a > end ? a : end;
      if (b > start) occupiedDays += days(start, b);
      if (b > end) end = b;
    }
    const utilizationPercent = eligibleDays
      ? Math.round((occupiedDays / eligibleDays) * 10000) / 100
      : null;
    const metric = {
      vehicleId: vehicle.id,
      periodDays,
      eligibleDays,
      occupiedDays,
      utilizationPercent,
      threshold,
      from: eligibleFrom,
      to: day,
    };
    utilization.push(metric);
    if (eligibleDays >= 7 && (occupiedDays / eligibleDays) * 100 < threshold)
      add(
        vehicle,
        "LOW_UTILIZATION",
        utilizationPercent < 20 ? "MEDIUM" : "LOW",
        "Low scheduled utilization",
        `Scheduled rentals occupy ${occupiedDays} of ${eligibleDays} eligible days (${utilizationPercent}%).`,
        metric,
      );
    if (vehicle.insuranceExpiration) {
      const expiration = dateString(vehicle.insuranceExpiration),
        remaining = days(day, expiration);
      if (remaining <= 30)
        add(
          vehicle,
          "INSURANCE_EXPIRATION",
          remaining < 0 ? "HIGH" : remaining <= 14 ? "MEDIUM" : "LOW",
          remaining < 0
            ? "Recorded insurance date has passed"
            : "Insurance date approaching",
          `Recorded insurance expiration is ${expiration}.`,
          {
            documentType: "Insurance",
            expirationDate: expiration,
            daysRemaining: remaining,
            windowDays:
              remaining < 0
                ? null
                : remaining <= 7
                  ? 7
                  : remaining <= 14
                    ? 14
                    : 30,
          },
        );
    }
  }
  const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  insights.sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.id.localeCompare(b.id),
  );
  return {
    source: "rules",
    calculatedAt,
    reportingPeriod: {
      from,
      to: day,
      periodDays,
      timezone: TIMEZONE,
      threshold,
    },
    limitations: [
      "Scheduled calendar-day utilization. Actual pickup and return timestamps and maintenance history are unavailable. Current maintenance/inactive vehicles remain in the historical denominator.",
      "Insurance dates are recorded values; document validity is not verified.",
    ],
    summary: {
      totalVehicles: vehicles.length,
      insightsCount: insights.length,
      highSeverityCount: insights.filter((i) => i.severity === "HIGH").length,
      vehiclesRequiringAttention: new Set(insights.map((i) => i.vehicleId))
        .size,
    },
    utilization,
    insights,
  };
}
export async function getInsights(companyId, input = {}) {
  const options = criteria(input),
    now = new Date(),
    day = today(now),
    from = addDays(day, -options.periodDays);
  return prisma.$transaction(
    async (tx) => {
      const vehicles = await tx.vehicle.findMany({
        where: { companyId },
        select: {
          id: true,
          brand: true,
          model: true,
          licensePlate: true,
          status: true,
          insuranceExpiration: true,
          createdAt: true,
        },
      });
      const reservations = await tx.reservation.findMany({
        where: {
          companyId,
          OR: [
            {
              status: { in: ["CONFIRMED", "IN_PROGRESS", "COMPLETED"] },
              startDate: { lt: parseDate(day) },
              endDate: { gt: parseDate(from) },
            },
            { status: "IN_PROGRESS", endDate: { lt: parseDate(day) } },
          ],
        },
        select: {
          id: true,
          companyId: true,
          vehicleId: true,
          startDate: true,
          endDate: true,
          status: true,
        },
      });
      return calculateInsights(companyId, vehicles, reservations, options, now);
    },
    { isolationLevel: "RepeatableRead" },
  );
}
