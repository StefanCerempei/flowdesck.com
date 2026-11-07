import { prisma } from "./prisma.js";
import { RentalError, notFound } from "./rental-errors.js";
export async function withVehicleLock(companyId, vehicleId, action) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const rows =
            await tx.$queryRaw`SELECT id FROM Vehicle WHERE companyId = ${companyId} AND id = ${vehicleId} FOR UPDATE`;
          if (!rows.length) notFound();
          const vehicle = await tx.vehicle.findFirst({
            where: { companyId, id: vehicleId },
          });
          return action(tx, vehicle);
        },
        { isolationLevel: "ReadCommitted", maxWait: 5000, timeout: 10000 },
      );
    } catch (error) {
      if (error.code !== "P2034") throw error;
      if (attempt === 2)
        throw new RentalError(
          503,
          "WRITE_RETRY",
          "Concurrent update could not complete. Refresh and retry.",
        );
      await new Promise((resolve) =>
        setTimeout(resolve, 20 + Math.random() * 50),
      );
    }
  }
}
