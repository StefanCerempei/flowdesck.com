import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import {
  DEMO_USER_ID,
  DEMO_EMAIL,
  DEMO_ROLE,
  DEMO_NAME,
} from "../src/lib/public-demo.js";
if (!process.env.TEST_DATABASE_URL)
  throw Error("Disposable TEST_DATABASE_URL required");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET ||= randomUUID();
const { prisma } = await import("../src/lib/prisma.js");
const { default: app } = await import("../src/app.js");
let server,
  base,
  token,
  other,
  tenant,
  foreignVehicle,
  foreignContact,
  ownerToken;
const call = async (path, method = "GET", body, auth = token) => {
  const r = await fetch(base + path, {
    method,
    headers: {
      ...(auth ? { Authorization: "Bearer " + auth } : {}),
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: r.status, data: await r.json() };
};
before(async () => {
  assert.equal(
    await prisma.user.count({
      where: { OR: [{ id: DEMO_USER_ID }, { email: DEMO_EMAIL }] },
    }),
    0,
    "Guest fixture collision",
  );
  tenant = await prisma.company.create({ data: { name: DEMO_NAME } });
  other = await prisma.company.create({
    data: { name: "Private isolation test" },
  });
  await prisma.user.create({
    data: {
      id: DEMO_USER_ID,
      email: DEMO_EMAIL,
      role: DEMO_ROLE,
      password: "unusable",
      companyId: tenant.id,
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: randomUUID() + "@invalid.test",
      password: "unusable",
      role: "SUPER_ADMIN",
      companyId: tenant.id,
    },
  });
  ownerToken = jwt.sign(
    { id: owner.id, companyId: tenant.id },
    process.env.JWT_SECRET,
  );
  foreignVehicle = await prisma.vehicle.create({
    data: {
      companyId: other.id,
      brand: "Private",
      model: "Car",
      licensePlate: randomUUID().slice(0, 20),
      category: "SUV",
      transmission: "MANUAL",
      dailyRate: "30",
    },
  });
  await prisma.vehicle.create({
    data: {
      companyId: tenant.id,
      brand: "Demo",
      model: "Car",
      licensePlate: "JURY01",
      category: "SUV",
      transmission: "MANUAL",
      dailyRate: "30",
      insuranceExpiration: new Date(),
    },
  });
  await prisma.task.create({
    data: { tenantId: other.id, title: "Private task" },
  });
  await prisma.invoice.create({
    data: { tenantId: other.id, invoiceNumber: "Private invoice", amount: 50 },
  });
  foreignContact = await prisma.contact.create({
    data: { tenantId: other.id, firstName: "Private", lastName: "Customer" },
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + server.address().port;
});
after(async () => {
  if (server)
    await new Promise((r) => {
      server.close(r);
      server.closeIdleConnections();
    });
  for (const c of [tenant, other].filter(Boolean)) {
    await prisma.reservation.deleteMany({ where: { companyId: c.id } });
    await prisma.invoice.deleteMany({ where: { tenantId: c.id } });
    await prisma.vehicle.deleteMany({ where: { companyId: c.id } });
    await prisma.contact.deleteMany({ where: { tenantId: c.id } });
    await prisma.task.deleteMany({ where: { tenantId: c.id } });
    await prisma.user.deleteMany({ where: { companyId: c.id } });
    await prisma.company.delete({ where: { id: c.id } });
  }
  await prisma.$disconnect();
});
test("disabled by default, restricted 15-minute token, all writes blocked, isolation, zero provider calls", async () => {
  delete process.env.PUBLIC_DEMO_ENABLED;
  assert.equal((await call("/api/demo/session", "POST", {}, null)).status, 503);
  process.env.PUBLIC_DEMO_ENABLED = "true";
  process.env.PUBLIC_DEMO_COMPANY_ID = other.id;
  assert.equal((await call("/api/demo/session", "POST", {}, null)).status, 503);
  process.env.PUBLIC_DEMO_COMPANY_ID = tenant.id;
  const login = await call("/api/demo/session", "POST", {}, null);
  assert.equal(login.status, 200);
  token = login.data.token;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  assert.equal(decoded.exp - decoded.iat, 900);
  assert.equal(login.data.user.role, DEMO_ROLE);
  for (const path of [
    "/api/contacts",
    "/api/tasks",
    "/api/invoices",
    "/api/settings",
    "/api/vehicles",
    "/api/reservations",
    "/api/fleet/dashboard",
    "/api/ai/fleet-insights",
  ]) {
    const r = await call(path);
    assert.equal(r.status, 200, path);
    assert.ok(!JSON.stringify(r.data).includes("Private"), path);
  }
  assert.equal((await call("/api/vehicles/" + foreignVehicle.id)).status, 404);
  assert.deepEqual(
    (await call("/api/reservations?vehicleId=" + foreignVehicle.id)).data.items,
    [],
  );
  assert.equal(
    (
      await call(
        "/api/auth/login",
        "POST",
        { email: DEMO_EMAIL, password: "unusable" },
        null,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await call(
        "/api/auth/register",
        "POST",
        {
          email: DEMO_EMAIL,
          password: "Some-password-123",
          companyName: "Bad",
        },
        null,
      )
    ).status,
    409,
  );
  const before = await Promise.all([
    prisma.contact.count({
      where: { tenantId: { in: [tenant.id, other.id] } },
    }),
    prisma.task.count({ where: { tenantId: { in: [tenant.id, other.id] } } }),
    prisma.invoice.count({
      where: { tenantId: { in: [tenant.id, other.id] } },
    }),
    prisma.vehicle.count({
      where: { companyId: { in: [tenant.id, other.id] } },
    }),
    prisma.reservation.count({
      where: { companyId: { in: [tenant.id, other.id] } },
    }),
  ]);
  for (const path of [
    "/api/contacts",
    "/api/contacts/" + foreignContact.id,
    "/api/tasks",
    "/api/tasks/" + randomUUID(),
    "/api/invoices",
    "/api/invoices/" + randomUUID(),
    "/api/settings",
    "/api/vehicles",
    "/api/vehicles/" + foreignVehicle.id,
    "/api/reservations",
    "/api/reservations/" + randomUUID() + "/status",
    "/api/auth/register",
    "/api/auth/login",
    "/api/dashboard/brief",
    "/api/future-write",
  ]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"])
      assert.equal(
        (await call(path, method, { title: "blocked", companyId: other.id }))
          .status,
        403,
        path + " " + method,
      );
  }
  assert.deepEqual(
    await Promise.all([
      prisma.contact.count({
        where: { tenantId: { in: [tenant.id, other.id] } },
      }),
      prisma.task.count({ where: { tenantId: { in: [tenant.id, other.id] } } }),
      prisma.invoice.count({
        where: { tenantId: { in: [tenant.id, other.id] } },
      }),
      prisma.vehicle.count({
        where: { companyId: { in: [tenant.id, other.id] } },
      }),
      prisma.reservation.count({
        where: { companyId: { in: [tenant.id, other.id] } },
      }),
    ]),
    before,
  );
  let providerCalls = 0;
  app.locals.bookingProvider = () => {
    providerCalls++;
    throw Error();
  };
  app.locals.insightsProvider = app.locals.bookingProvider;
  const proposal = await call("/api/ai/booking-proposals", "POST", {
    inquiry: "I would like a car tomorrow.",
    locale: "en-GB",
  });
  assert.equal(proposal.status, 200);
  assert.equal(proposal.data.source, "local");
  assert.equal(
    (await call("/api/ai/fleet-insights/explain", "POST", { locale: "ro-RO" }))
      .data.source,
    "rules",
  );
  assert.equal(providerCalls, 0);
  assert.equal(
    (
      await call(
        "/api/tasks",
        "POST",
        { title: "Owner still works" },
        ownerToken,
      )
    ).status,
    201,
  );
  const forged = jwt.sign(
    { id: DEMO_USER_ID, companyId: other.id, demoGuest: true },
    process.env.JWT_SECRET,
    { expiresIn: "15m", audience: "flowdesck-public-demo" },
  );
  assert.equal((await call("/api/contacts", "GET", null, forged)).status, 401);
  const expired = jwt.sign(
    { id: DEMO_USER_ID, companyId: tenant.id, demoGuest: true },
    process.env.JWT_SECRET,
    { expiresIn: -1, audience: "flowdesck-public-demo" },
  );
  assert.equal((await call("/api/tasks", "GET", null, expired)).status, 401);
  delete process.env.PUBLIC_DEMO_ENABLED;
  assert.equal((await call("/api/tasks")).status, 401);
  process.env.PUBLIC_DEMO_ENABLED = "true";
  for (let i = 0; i < 30; i++)
    await call("/api/demo/session", "POST", {}, null);
  assert.equal((await call("/api/demo/session", "POST", {}, null)).status, 429);
});
