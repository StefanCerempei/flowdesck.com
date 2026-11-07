import { prisma } from "../../lib/prisma.js";
import { withVehicleLock } from "../../lib/rental-transaction.js";
import { conflict, notFound } from "../../lib/rental-errors.js";
import { dateString, parseDate, today } from "../../lib/rental-dates.js";
import { moneyString } from "../../lib/rental-money.js";
export const vehicleDTO = (v) => ({
  ...v,
  dailyRate: moneyString(v.dailyRate),
  insuranceExpiration: v.insuranceExpiration
    ? dateString(v.insuranceExpiration)
    : null,
  currency: "EUR",
});
export async function getVehicle(companyId, id) {
  const vehicle = await prisma.vehicle.findFirst({ where: { companyId, id } });
  if (!vehicle) notFound();
  return vehicleDTO(vehicle);
}
export const createVehicle = (companyId, data) =>
  prisma.vehicle.create({ data: { ...data, companyId } }).then(vehicleDTO);
export const updateVehicle = (companyId, id, data) =>
  withVehicleLock(companyId, id, async (tx) => {
    if (data.status && data.status !== "AVAILABLE") {
      const commitment = await tx.reservation.findFirst({
        where: {
          companyId,
          vehicleId: id,
          OR: [
            { status: "IN_PROGRESS" },
            { status: "CONFIRMED", endDate: { gt: parseDate(today()) } },
          ],
        },
      });
      if (commitment)
        conflict(
          "ACTIVE_COMMITMENTS",
          "Resolve active and upcoming reservations before taking this vehicle out of service.",
        );
    }
    return vehicleDTO(
      await tx.vehicle.update({
        where: { companyId_id: { companyId, id } },
        data,
      }),
    );
  });
