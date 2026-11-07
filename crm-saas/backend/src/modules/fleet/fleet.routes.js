import { calculateInsights } from "../insights/insights.service.js";
import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { protectRoute } from "../../middleware/auth.middleware.js";
import { route } from "../../lib/rental-errors.js";
import { object } from "../../lib/rental-validation.js";
import {
  today,
  addDays,
  parseDate,
  period,
  TIMEZONE,
} from "../../lib/rental-dates.js";
import {
  includeReservation,
  reservationDTO,
} from "../reservations/reservations.service.js";
import { vehicleDTO } from "../vehicles/vehicles.service.js";
import { moneyString } from "../../lib/rental-money.js";
import { Prisma } from "@prisma/client";
const router = Router();
router.use(protectRoute);
router.get(
  "/dashboard",
  route(async (req, res) => {
    object(req.query, ["from", "to"]);
    const companyId = req.user.companyId,
      day = today(),
      next = addDays(day, 1);
    const from = req.query.from || day,
      to = req.query.to || addDays(day, 30),
      window = period(from, to);
    const pickupStart = parseDate(from > day ? from : day);
    const { vehicles, reservations, tasks, company } =
      await prisma.$transaction(
        async (tx) => ({
          vehicles: await tx.vehicle.findMany({ where: { companyId } }),
          reservations: await tx.reservation.findMany({
            where: { companyId },
            include: includeReservation,
          }),
          tasks: await tx.task.findMany({
            where: { tenantId: companyId },
            orderBy: { createdAt: "desc" },
          }),
          company: await tx.company.findUnique({
            where: { id: companyId },
            select: { name: true },
          }),
        }),
        { isolationLevel: "RepeatableRead" },
      );
    const current = reservations.filter((r) => r.status === "IN_PROGRESS"),
      confirmed = reservations.filter((r) => r.status === "CONFIRMED");
    const available = vehicles.filter(
      (v) =>
        v.status === "AVAILABLE" &&
        !reservations.some(
          (r) =>
            r.vehicleId === v.id &&
            ((["CONFIRMED", "IN_PROGRESS"].includes(r.status) &&
              r.startDate < parseDate(next) &&
              r.endDate > parseDate(day)) ||
              (r.status === "IN_PROGRESS" && r.endDate <= parseDate(day))),
        ),
    );
    const bookedValue = reservations
      .filter(
        (r) =>
          r.status !== "CANCELLED" &&
          r.startDate >= window.startDate &&
          r.startDate < window.endDate,
      )
      .reduce((sum, r) => sum.add(r.agreedTotal), new Prisma.Decimal(0));
    res.json({
      intelligence: calculateInsights(companyId, vehicles, reservations),
      asOf: new Date().toISOString(),
      today: day,
      timezone: TIMEZONE,
      currency: "EUR",
      company: company.name,
      availabilityPeriod: { startDate: day, endDate: next },
      valuePeriod: { from, to },
      stats: {
        totalVehicles: vehicles.length,
        outNow: current.length,
        availableToday: available.length,
        maintenance: vehicles.filter((v) => v.status === "MAINTENANCE").length,
        upcomingPickups: confirmed.filter(
          (r) => r.startDate >= pickupStart && r.startDate < window.endDate,
        ).length,
        overdueReturns: current.filter((r) => r.endDate <= parseDate(day))
          .length,
        bookedValue: moneyString(bookedValue),
      },
      pickups: confirmed
        .filter((r) => r.startDate.getTime() === parseDate(day).getTime())
        .map(reservationDTO),
      returns: current
        .sort((a, b) => a.endDate - b.endDate)
        .map(reservationDTO),
      recentReservations: [...reservations]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 6)
        .map(reservationDTO),
      upcomingReservations: confirmed
        .filter((r) => r.startDate >= parseDate(day))
        .sort((a, b) => a.startDate - b.startDate)
        .slice(0, 6)
        .map(reservationDTO),
      attention: vehicles
        .filter(
          (v) =>
            v.status !== "AVAILABLE" ||
            (v.insuranceExpiration &&
              v.insuranceExpiration <= parseDate(addDays(day, 30))),
        )
        .map(vehicleDTO),
      tasks,
    });
  }),
);
export default router;
