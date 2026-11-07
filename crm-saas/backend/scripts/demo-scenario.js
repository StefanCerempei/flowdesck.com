import "dotenv/config";
import { readFile, writeFile, chmod } from "node:fs/promises";
import { createHash } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { assertDemoTarget } from "./seed-rental-demo.js";

const checkpoint = new URL("../.env.demo-scenario.json", import.meta.url);
const hash = createHash("sha256")
  .update("flowdesck-timis-rental-demo-v1:company")
  .digest("hex");
const companyId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
const tables = {
  vehicle: "companyId",
  contact: "tenantId",
  reservation: "companyId",
  task: "tenantId",
};
const dateFields = [
  "createdAt",
  "updatedAt",
  "startDate",
  "endDate",
  "insuranceExpiration",
];
function restoreTypes(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      dateFields.includes(key) && value !== null ? new Date(value) : value,
    ]),
  );
}
export async function demoScenario(action) {
  assertDemoTarget();
  if (process.env.DEMO_SCENARIO_CONFIRM !== "RESTORE_TIMIS_DEMO")
    throw new Error(
      "Explicit DEMO_SCENARIO_CONFIRM=RESTORE_TIMIS_DEMO is required.",
    );
  if (!["capture", "restore"].includes(action))
    throw new Error("Use capture or restore.");
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (company?.name !== "Timiș Rent Demo")
    throw new Error("Demo identity mismatch.");
  if (action === "capture") {
    const data = await prisma.$transaction(
      async (tx) => {
        const records = {};
        for (const [model, field] of Object.entries(tables))
          records[model] = await tx[model].findMany({
            where: { [field]: companyId },
            orderBy: { id: "asc" },
          });
        if (
          records.vehicle.length !== 12 ||
          records.contact.length !== 12 ||
          records.reservation.length !== 22
        )
          throw new Error(
            "Capture requires the original 12/12/22 demo baseline.",
          );
        return {
          version: 1,
          companyId,
          capturedAt: new Date().toISOString(),
          records,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    await writeFile(checkpoint, JSON.stringify(data, null, 2), {
      flag: "wx",
      mode: 0o600,
    });
    console.log(
      "Original demo scenario captured privately. Existing checkpoints are never overwritten.",
    );
    return;
  }
  const data = JSON.parse(await readFile(checkpoint, "utf8"));
  if (data.version !== 1 || data.companyId !== companyId)
    throw new Error("Checkpoint identity mismatch.");
  for (const [model, field] of Object.entries(tables)) {
    if (
      !Array.isArray(data.records[model]) ||
      data.records[model].some((row) => row[field] !== companyId)
    )
      throw new Error("Invalid tenant in checkpoint.");
  }
  // Keep authentication and company records. Refuse invoice-linked data rather than discarding it.
  await prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM Company WHERE id=${companyId} FOR UPDATE`;
      if (await tx.invoice.count({ where: { tenantId: companyId } }))
        throw new Error(
          "Demo invoices need explicit review before restoring the scenario.",
        );
      await tx.reservation.deleteMany({ where: { companyId } });
      await tx.task.deleteMany({ where: { tenantId: companyId } });
      await tx.vehicle.deleteMany({ where: { companyId } });
      await tx.contact.deleteMany({ where: { tenantId: companyId } });
      for (const model of ["contact", "vehicle", "reservation", "task"])
        await tx[model].createMany({
          data: data.records[model].map(restoreTypes),
        });
    },
    { isolationLevel: "Serializable", timeout: 30000 },
  );
  await chmod(checkpoint, 0o600);
  console.log("Demo scenario restored atomically. Authentication preserved.");
}
if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  try {
    await demoScenario(process.argv[2]);
  } catch (error) {
    console.error(
      error.code === "EEXIST"
        ? "Checkpoint already exists; preserved."
        : error.message,
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
