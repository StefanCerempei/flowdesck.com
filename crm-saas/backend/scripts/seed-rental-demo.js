import "dotenv/config";
import bcrypt from "bcryptjs";
import { writeFile } from "node:fs/promises";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { today, addDays, parseDate, period } from "../src/lib/rental-dates.js";
import { price } from "../src/lib/rental-money.js";
import { blockingWhere } from "../src/modules/reservations/reservations.service.js";

// New isolated records only. No deletes, updates, or production auto-seeding.
export function assertDemoTarget() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.RENTAL_DEMO_CONFIRM !== "TIMIS_RENT_DEMO"
  )
    throw new Error(
      "Demo requires non-production NODE_ENV and RENTAL_DEMO_CONFIRM=TIMIS_RENT_DEMO.",
    );
  const url = new URL(process.env.DATABASE_URL || "");
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^\/[a-zA-Z0-9_]+_(dev|test|demo)$/.test(url.pathname)
  )
    throw new Error(
      "Demo seed only accepts an explicitly local *_dev, *_test or *_demo database.",
    );
}
const demoId = (key) => {
  const h = createHash("sha256")
    .update("flowdesck-timis-rental-demo-v1:" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const companyId = demoId("company"),
  email = "demo@timis-rent.example";
export async function seedRentalDemo() {
  assertDemoTarget();
  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    include: { users: { where: { email }, select: { id: true } } },
  });
  if (existing) {
    if (existing.name !== "Timiș Rent Demo" || existing.users.length !== 1)
      throw new Error("Demo identity collision; no data changed.");
    console.log(
      "Timiș Rent Demo already exists; data and credentials left unchanged.",
    );
    return { companyId, created: false };
  }
  if (await prisma.user.findUnique({ where: { email } }))
    throw new Error("Demo email is already in use; no data changed.");
  const password =
    process.env.DEMO_PASSWORD || randomBytes(18).toString("base64url");
  if (Buffer.byteLength(password) > 72 || password.length < 12)
    throw new Error(
      "DEMO_PASSWORD must contain 12+ characters and at most 72 UTF-8 bytes.",
    );
  const hashed = await bcrypt.hash(password, 10),
    day = today();
  const cars = [
    ["Dacia", "Sandero", "ECONOMY", "MANUAL", "32.50"],
    ["Renault", "Clio", "ECONOMY", "MANUAL", "35.00"],
    ["Toyota", "Yaris", "COMPACT", "AUTOMATIC", "44.90"],
    ["Volkswagen", "Golf", "COMPACT", "AUTOMATIC", "49.50"],
    ["Skoda", "Octavia", "COMPACT", "MANUAL", "46.00"],
    ["Hyundai", "i30", "COMPACT", "MANUAL", "42.00"],
    ["Dacia", "Duster", "SUV", "MANUAL", "55.00"],
    ["Toyota", "Corolla", "COMPACT", "AUTOMATIC", "52.00"],
    ["Kia", "Sportage", "SUV", "AUTOMATIC", "68.00"],
    ["Ford", "Transit", "VAN", "MANUAL", "79.00"],
    ["Renault", "Captur", "SUV", "AUTOMATIC", "58.00"],
    ["Opel", "Corsa", "ECONOMY", "MANUAL", "34.00"],
  ];
  await prisma.$transaction(
    async (tx) => {
      await tx.company.create({
        data: {
          id: companyId,
          name: "Timiș Rent Demo",
          createdAt: parseDate(addDays(day, -60)),
          users: {
            create: {
              id: demoId("user"),
              email,
              password: hashed,
              role: "SUPER_ADMIN",
            },
          },
        },
      });
      for (let i = 0; i < 12; i++)
        await tx.contact.create({
          data: {
            id: demoId("contact" + i),
            tenantId: companyId,
            firstName: [
              "Ana",
              "Mihai",
              "Elena",
              "Dan",
              "Ioana",
              "Radu",
              "Maria",
              "Andrei",
              "Daria",
              "Vlad",
              "Irina",
              "Alex",
            ][i],
            lastName: "Demo " + (i + 1),
            email: `client${i + 1}@timis-rent.example`,
            phone: `+4070000${String(i + 1).padStart(4, "0")}`,
            status: "ACTIVE",
            notes: "Fictional rental demo customer. Not a real person.",
          },
        });
      for (let i = 0; i < cars.length; i++) {
        const [brand, model, category, transmission, dailyRate] = cars[i];
        await tx.vehicle.create({
          data: {
            id: demoId("vehicle" + i),
            companyId,
            brand,
            model,
            category,
            transmission,
            dailyRate,
            licensePlate: `TMDEMO${String(i + 1).padStart(2, "0")}`,
            status:
              i === 10 ? "MAINTENANCE" : i === 11 ? "INACTIVE" : "AVAILABLE",
            insuranceExpiration: parseDate(
              addDays(day, i === 0 ? 14 : 180 + i),
            ),
            createdAt: parseDate(addDays(day, -60)),
          },
        });
      }
      // Historical, active, upcoming and cancelled records. No blocking overlaps.
      const bookings = [];
      for (let i = 0; i < 8; i++)
        bookings.push([i, -25 + i, -23 + i, "COMPLETED"]);
      for (let i = 0; i < 5; i++)
        bookings.push([i, -14 + i, -12 + i, "COMPLETED"]);
      bookings.push(
        [0, -4, -1, "IN_PROGRESS"],
        [1, -1, 2, "IN_PROGRESS"],
        [2, 0, 2, "CONFIRMED"],
        [3, 1, 4, "CONFIRMED"],
        [4, 2, 5, "CONFIRMED"],
        [5, 3, 6, "CONFIRMED"],
        [6, 4, 7, "CONFIRMED"],
        [7, 2, 4, "CANCELLED"],
        [8, 1, 3, "CANCELLED"],
      );
      for (let i = 0; i < bookings.length; i++) {
        const [v, start, end, status] = bookings[i],
          vehicleId = demoId("vehicle" + v),
          dates = period(addDays(day, start), addDays(day, end));
        await tx.$queryRaw`SELECT id FROM Vehicle WHERE companyId=${companyId} AND id=${vehicleId} FOR UPDATE`;
        if (
          ["CONFIRMED", "IN_PROGRESS"].includes(status) &&
          (await tx.reservation.findFirst({
            where: { ...blockingWhere(companyId, dates), vehicleId },
          }))
        )
          throw new Error("Demo fixture overlap; rolling back.");
        await tx.reservation.create({
          data: {
            id: demoId("booking" + i),
            companyId,
            vehicleId,
            contactId: demoId("contact" + (i % 12)),
            startDate: dates.startDate,
            endDate: dates.endDate,
            status,
            agreedTotal: price(cars[v][4], dates.billedDays),
            createdAt: parseDate(addDays(day, -30)),
          },
        });
      }
      for (const [i, title] of [
        "Follow up on overdue Sandero return",
        "Renew Sandero insurance — demo reminder",
        "Prepare Golf for upcoming pickup",
      ].entries())
        await tx.task.create({
          data: {
            id: demoId("task" + i),
            tenantId: companyId,
            title,
            priority: i === 0 ? "Urgent" : "Normal",
          },
        });
    },
    { isolationLevel: "ReadCommitted", timeout: 30000 },
  );
  await writeFile(new URL("../.env.seed-login.json", import.meta.url), JSON.stringify({email,password}), {mode:0o600});
  console.log("Created fictional Timiș Rent Demo: 12 vehicles, 12 customers, 22 reservations. Credentials saved locally.");
  return { companyId, created: true, password };
}
if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  try {
    await seedRentalDemo();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
