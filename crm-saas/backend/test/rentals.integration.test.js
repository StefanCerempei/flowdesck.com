import "dotenv/config";
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
if (!process.env.TEST_DATABASE_URL)
  throw new Error("Explicit disposable TEST_DATABASE_URL required.");
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET ||= randomUUID();
const { default: app } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { today, addDays, parseDate } =
  await import("../src/lib/rental-dates.js");
let server, base, a, b, customer, otherCustomer, viewer;
const companies = [];
const day = today();
async function request(path, { method = "GET", body, token = a?.token } = {}) {
  const res = await fetch(base + "/api" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }
  return { status: res.status, data };
}
async function account() {
  const email = randomUUID() + "@rental-test.invalid";
  assert.equal(
    (
      await request("/auth/register", {
        method: "POST",
        body: {
          email,
          password: "Rental-test-1234",
          companyName: "Rental integration fixture",
        },
        token: null,
      })
    ).status,
    201,
  );
  const user = await prisma.user.findUnique({ where: { email } });
  companies.push(user.companyId);
  const login = await request("/auth/login", {
    method: "POST",
    body: { email, password: "Rental-test-1234" },
    token: null,
  });
  return login.data;
}
async function car(extra = {}) {
  const r = await request("/vehicles", {
    method: "POST",
    body: {
      brand: "Dacia",
      model: "Sandero",
      licensePlate: "T" + randomUUID().replaceAll("-", "").slice(0, 15),
      category: "ECONOMY",
      transmission: "MANUAL",
      dailyRate: "32.50",
      ...extra,
    },
  });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  return r.data;
}
const booking = (v, start = 2, end = 4, extra = {}) => ({
  vehicleId: v.id,
  contactId: customer.id,
  startDate: addDays(day, start),
  endDate: addDays(day, end),
  confirmed: true,
  ...extra,
});
async function book(v, start = 2, end = 4, extra = {}) {
  return request("/reservations", {
    method: "POST",
    body: booking(v, start, end, extra),
  });
}
async function status(r, value) {
  return request("/reservations/" + r.id + "/status", {
    method: "PATCH",
    body: { status: value, expectedUpdatedAt: r.updatedAt },
  });
}
const available = async (start, end) =>
  request(
    "/reservations/availability?" +
      new URLSearchParams({
        startDate: addDays(day, start),
        endDate: addDays(day, end),
      }),
  );
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = "http://127.0.0.1:" + server.address().port;
  a = await account();
  b = await account();
  customer = await prisma.contact.create({
    data: {
      tenantId: a.user.companyId,
      firstName: "Rental",
      lastName: "Client",
    },
  });
  otherCustomer = await prisma.contact.create({
    data: {
      tenantId: b.user.companyId,
      firstName: "Private",
      lastName: "Client",
    },
  });
  const u = await prisma.user.create({
    data: {
      companyId: a.user.companyId,
      email: randomUUID() + "@viewer.invalid",
      password: "unused-hash",
      role: "VIEWER",
    },
  });
  viewer = jwt.sign(
    { id: u.id, companyId: u.companyId },
    process.env.JWT_SECRET,
  );
});
after(async () => {
  await prisma.reservation.deleteMany({
    where: { companyId: { in: companies } },
  });
  await prisma.vehicle.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.invoice.deleteMany({ where: { tenantId: { in: companies } } });
  await prisma.contact.deleteMany({ where: { tenantId: { in: companies } } });
  await prisma.task.deleteMany({ where: { tenantId: { in: companies } } });
  await prisma.user.deleteMany({ where: { companyId: { in: companies } } });
  await prisma.company.deleteMany({ where: { id: { in: companies } } });
  await prisma.$disconnect();
  if (server)
    await new Promise((r) => {
      server.close(r);
      server.closeIdleConnections();
    });
});
test("vehicle create/read/update, normalized duplicate, validation and protected fields", async () => {
  const v = await car({ licensePlate: "TM-01 TEST" });
  assert.equal(v.licensePlate, "TM01TEST");
  assert.equal(v.dailyRate, "32.50");
  assert.equal((await request("/vehicles/" + v.id)).status, 200);
  assert.equal(
    (
      await request("/vehicles/" + v.id, {
        method: "PATCH",
        body: { brand: "Renault", dailyRate: "40.10" },
      })
    ).data.dailyRate,
    "40.10",
  );
  assert.equal(
    (
      await request("/vehicles", {
        method: "POST",
        body: {
          brand: "Other",
          model: "Car",
          licensePlate: "tm01test",
          category: "ECONOMY",
          transmission: "MANUAL",
          dailyRate: "20.00",
        },
      })
    ).status,
    409,
  );
  for (const body of [
    { dailyRate: "0" },
    { dailyRate: "-1" },
    { dailyRate: 20 },
    { transmission: "FLYING" },
    { status: "RENTED" },
    { companyId: b.user.companyId },
    { insuranceExpiration: "2026-02-30" },
    {},
  ])
    assert.equal(
      (await request("/vehicles/" + v.id, { method: "PATCH", body })).status,
      400,
      JSON.stringify(body),
    );
});
test("vehicle and reservation tenant isolation, including forged relation IDs", async () => {
  const v = await car();
  for (const method of ["GET", "PATCH"])
    assert.equal(
      (
        await request("/vehicles/" + v.id, {
          method,
          token: b.token,
          ...(method === "PATCH" ? { body: { model: "stolen" } } : {}),
        })
      ).status,
      404,
    );
  const r = await book(v);
  assert.equal(r.status, 201);
  assert.equal(
    (await request("/reservations/" + r.data.id, { token: b.token })).status,
    404,
  );
  assert.equal(
    (
      await request("/reservations/" + r.data.id, {
        method: "PATCH",
        token: b.token,
        body: { status: "CANCELLED", expectedUpdatedAt: r.data.updatedAt },
      })
    ).status,
    404,
  );
  assert.equal(
    (await book(await car(), 2, 4, { contactId: otherCustomer.id })).status,
    404,
  );
  const list = await request("/vehicles", { token: b.token });
  assert.equal(list.data.items.length, 0);
  await assert.rejects(
    prisma.reservation.create({
      data: {
        companyId: b.user.companyId,
        vehicleId: v.id,
        contactId: otherCustomer.id,
        startDate: parseDate(addDays(day, 10)),
        endDate: parseDate(addDays(day, 12)),
        agreedTotal: "1.00",
      },
    }),
    (e) => e.code === "P2003",
  );
});
test("VIEWER reads but cannot write rentals", async () => {
  const v = await car();
  assert.equal((await request("/vehicles", { token: viewer })).status, 200);
  assert.equal(
    (
      await request("/vehicles/" + v.id, {
        method: "PATCH",
        token: viewer,
        body: { model: "No" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/reservations", {
        method: "POST",
        token: viewer,
        body: booking(v),
      })
    ).status,
    403,
  );
});
test("valid booking uses exact price, history survives rate changes and contact delete", async () => {
  const v = await car();
  const r = await book(v, 2, 5);
  assert.equal(r.status, 201);
  assert.equal(r.data.agreedTotal, "97.50");
  assert.equal(r.data.priceBreakdown.billedDays, 3);
  await request("/vehicles/" + v.id, {
    method: "PATCH",
    body: { dailyRate: "99.00" },
  });
  assert.equal(
    (await request("/reservations/" + r.data.id)).data.agreedTotal,
    "97.50",
  );
  assert.equal(
    (await request("/contacts/" + customer.id, { method: "DELETE" })).status,
    409,
  );
  assert.equal(
    (
      await request("/vehicles/" + v.id, {
        method: "PATCH",
        body: { status: "INACTIVE" },
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/vehicles/" + v.id, { method: "DELETE" })).status,
    405,
  );
});
test("invalid periods, stale quote, confirmation, maintenance and inactive vehicles rejected", async () => {
  const v = await car();
  for (const [start, end] of [
    [4, 2],
    [2, 2],
    [-1, 1],
    [0, 366],
  ])
    assert.equal((await book(v, start, end)).status, 400);
  assert.equal((await book(v, 2, 4, { startDate: "2026-02-30" })).status, 400);
  assert.equal((await book(v, 2, 4, { agreedTotal: "1.00" })).status, 409);
  assert.equal((await book(v, 2, 4, { confirmed: false })).status, 400);
  for (const state of ["MAINTENANCE", "INACTIVE"]) {
    const x = await car({ status: state });
    assert.equal((await book(x)).status, 409);
    assert.ok(
      !(await available(2, 4)).data.items.some((o) => o.vehicle.id === x.id),
    );
  }
  const override = await book(v, 2, 4, {
    agreedTotal: "50.00",
    overridePrice: true,
  });
  assert.equal(override.data.agreedTotal, "50.00");
});
test("half-open adjacency accepted, overlap rejected, cancellation releases capacity", async () => {
  const v = await car();
  const first = await book(v, 2, 4);
  assert.equal(first.status, 201);
  assert.equal((await book(v, 4, 6)).status, 201);
  assert.equal((await book(v, 3, 5)).status, 409);
  assert.ok(
    !(await available(2, 4)).data.items.some((o) => o.vehicle.id === v.id),
  );
  assert.equal((await status(first.data, "CANCELLED")).status, 200);
  assert.ok(
    (await available(2, 4)).data.items.some((o) => o.vehicle.id === v.id),
  );
  assert.equal((await book(v, 2, 4)).status, 201);
});
test("date edits reject overlap, immutable vehicle IDs, stale writes and cancelled transitions", async () => {
  const v = await car(),
    r = (await book(v, 2, 4)).data;
  await book(v, 5, 7);
  assert.equal(
    (
      await request("/reservations/" + r.id, {
        method: "PATCH",
        body: {
          startDate: addDays(day, 3),
          endDate: addDays(day, 6),
          expectedUpdatedAt: r.updatedAt,
        },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("/reservations/" + r.id, {
        method: "PATCH",
        body: { vehicleId: randomUUID(), expectedUpdatedAt: r.updatedAt },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/reservations/" + r.id, {
        method: "PATCH",
        body: {
          startDate: addDays(day, 2),
          endDate: addDays(day, 5),
          expectedUpdatedAt: r.updatedAt,
        },
      })
    ).status,
    200,
  );
  assert.equal((await status(r, "CANCELLED")).status, 409);
  const latest = (await request("/reservations/" + r.id)).data;
  assert.equal((await status(latest, "IN_PROGRESS")).status, 409);
  const cancelled = await status(latest, "CANCELLED");
  assert.equal(cancelled.status, 200);
  assert.equal((await status(cancelled.data, "IN_PROGRESS")).status, 409);
});
test("rental pickup/return, overdue vehicle conservatively blocked", async () => {
  const v = await car(),
    r = (await book(v, 0, 2)).data;
  const active = await status(r, "IN_PROGRESS");
  assert.equal(active.status, 200);
  assert.equal((await status(active.data, "COMPLETED")).status, 200);
  assert.ok(
    (await available(0, 2)).data.items.some((o) => o.vehicle.id === v.id),
  );
  const late = await car();
  await prisma.reservation.create({
    data: {
      companyId: a.user.companyId,
      vehicleId: late.id,
      contactId: customer.id,
      startDate: parseDate(addDays(day, -3)),
      endDate: parseDate(addDays(day, -1)),
      status: "IN_PROGRESS",
      agreedTotal: "65.00",
    },
  });
  assert.equal((await book(late, 10, 12)).status, 409);
  assert.ok(
    !(await available(10, 12)).data.items.some((o) => o.vehicle.id === late.id),
  );
});
test("independent concurrent HTTP creates: exactly one overlapping reservation succeeds", async () => {
  const v = await car();
  const results = await Promise.all([book(v, 12, 15), book(v, 13, 16)]);
  assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
  assert.equal(
    await prisma.reservation.count({
      where: {
        companyId: a.user.companyId,
        vehicleId: v.id,
        status: "CONFIRMED",
      },
    }),
    1,
  );
});
test("concurrent date edits use the same lock and cannot produce overlaps", async () => {
  const v = await car(),
    r1 = (await book(v, 10, 12)).data,
    r2 = (await book(v, 14, 16)).data;
  const results = await Promise.all([
    request("/reservations/" + r1.id, {
      method: "PATCH",
      body: {
        startDate: addDays(day, 11),
        endDate: addDays(day, 14),
        expectedUpdatedAt: r1.updatedAt,
      },
    }),
    request("/reservations/" + r2.id, {
      method: "PATCH",
      body: {
        startDate: addDays(day, 13),
        endDate: addDays(day, 15),
        expectedUpdatedAt: r2.updatedAt,
      },
    }),
  ]);
  assert.deepEqual(results.map((x) => x.status).sort(), [200, 409]);
});
test("dashboard uses real company records and availability aliases agree", async () => {
  const dashboard = await request("/fleet/dashboard");
  assert.equal(dashboard.status, 200);
  assert.equal(
    dashboard.data.stats.totalVehicles,
    await prisma.vehicle.count({ where: { companyId: a.user.companyId } }),
  );
  assert.equal(dashboard.data.timezone, "Europe/Bucharest");
  const query = new URLSearchParams({
    startDate: day,
    endDate: addDays(day, 1),
  });
  assert.equal(
    (await request("/vehicles/availability?" + query)).data.items.length,
    (await available(0, 1)).data.items.length,
  );
  assert.equal(
    dashboard.data.stats.availableToday,
    (await available(0, 1)).data.items.length,
  );
});

test("long-period search returns only offers that fit the booking total column", async () => {
  const expensive = await car({ dailyRate: "99999999.99" });
  const affordable = await car();
  const longPeriod = await available(1, 366);
  assert.equal(longPeriod.status, 200);
  assert.ok(longPeriod.data.items.some(({ vehicle }) => vehicle.id === affordable.id));
  assert.ok(!longPeriod.data.items.some(({ vehicle }) => vehicle.id === expensive.id));
  assert.ok((await available(1, 2)).data.items.some(({ vehicle }) => vehicle.id === expensive.id));
});

test("upcoming pickup count respects both ends of a future reporting window", async () => {
  const vehicle = await car();
  for (const offset of [81, 82, 83]) {
    assert.equal((await book(vehicle, offset, offset + 1)).status, 201);
  }
  const window = new URLSearchParams({ from: addDays(day, 82), to: addDays(day, 83) });
  const result = await request("/fleet/dashboard?" + window);
  assert.equal(result.status, 200);
  assert.equal(result.data.stats.upcomingPickups, 1);
});

test("Copilot uses owned real offers, budget and preferences; interpretation never writes bookings", async () => {
  const { extraction } = await import("./support/extraction.js");
  const vehicle = await car({brand:"Volkswagen",model:"Golf",transmission:"AUTOMATIC",dailyRate:"39.90"});
  await car({brand:"Volkswagen",model:"Golf",transmission:"AUTOMATIC",dailyRate:"300.00"});
  const alternative = await car({model:"Clio",transmission:"AUTOMATIC",dailyRate:"35.00"});
  const start = addDays(day,91), end = addDays(day,94);
  const message = `Volkswagen Golf automatic from ${start} to ${end}, maximum 120 EUR`;
  let facts = {preferredModel:"Golf",preferredBrand:"Volkswagen",transmission:"AUTOMATIC",maxTotalBudget:"120",currency:"EUR",pickupText:start,returnText:end};
  app.locals.bookingProvider = async () => extraction(facts);
  const interpret = (inquiry,token=a.token) => request("/ai/booking-proposals",{method:"POST",token,body:{inquiry,locale:"en-GB"}});
  try {
    assert.equal((await interpret(message,null)).status,401);
    const count = () => prisma.reservation.count({where:{companyId:a.user.companyId}});
    const before = await count();
    const response = await interpret(message);
    assert.equal(response.status,200); assert.deepEqual(response.data.offers.map(o=>o.vehicleId),[vehicle.id]);
    assert.equal(response.data.offers[0].total,"119.70"); assert.match(response.data.replyDraft,/119\.70/);
    assert.deepEqual((await interpret(message,b.token)).data.offers,[]);
    facts.returnText=null;
    const incomplete = await interpret(`Golf from ${start}`);
    assert.ok(incomplete.data.clarificationQuestion); assert.deepEqual(incomplete.data.offers,[]);
    assert.equal(await count(),before);
    facts.returnText=end;
    assert.equal((await book(vehicle,91,94,{confirmed:false})).status,400);
    assert.equal((await book(vehicle,91,94,{agreedTotal:"119.70"})).status,201);
    assert.equal((await book(vehicle,91,94)).status,409);
    const refreshed = await interpret(message);
    assert.ok(refreshed.data.offers.some(o=>o.vehicleId===alternative.id && o.mismatches.includes("model")));
    assert.ok(refreshed.data.offers.every(o=>o.vehicleId!==vehicle.id && Number(o.total)<=120 && o.mismatches.length));
  } finally {delete app.locals.bookingProvider;}
});

test("proposal rate budget is tenant-scoped and manual fields use real priced inventory", async () => {
  const tenant = await account();
  const body = {inquiry:"Review manually",manual:true,locale:"en-GB",clarifications:{
    startDate:addDays(day,90),endDate:addDays(day,91)}};
  for (let i=0; i<12; i++) {
    const response = await request("/ai/booking-proposals",{method:"POST",token:tenant.token,body});
    assert.equal(response.status,200); assert.equal(response.data.source,"local"); assert.deepEqual(response.data.offers,[]);
  }
  assert.equal((await request("/ai/booking-proposals",{method:"POST",token:tenant.token,body})).status,429);
  const another = await request("/ai/booking-proposals",{method:"POST",body});
  assert.equal(another.status,200); assert.ok(another.data.offers.length);
});

test("Fleet Intelligence is private, read-only and consistent with dashboard",async()=>{
 const mine=await request("/ai/fleet-insights?periodDays=30");
 assert.equal(mine.status,200);
 assert.equal((await request("/ai/fleet-insights",{token:null})).status,401);
 assert.equal((await request("/ai/fleet-insights?companyId=other")).status,400);
 assert.equal((await request("/ai/fleet-insights?periodDays=14")).status,400);
 assert.deepEqual(mine.data.summary,(await request("/fleet/dashboard")).data.intelligence.summary);
 const other=await request("/ai/fleet-insights",{token:b.token});
 assert.equal(other.data.summary.totalVehicles,0);
 assert.ok(!JSON.stringify(mine.data).includes(customer.id));
 const before=await prisma.reservation.count({where:{companyId:a.user.companyId}});
 app.locals.insightsProvider=async()=>JSON.stringify({recommendations:[{findingId:"made-up",action:"CHARGE_CUSTOMER"}]});
 try{
 const result=await request("/ai/fleet-insights/explain",{method:"POST",body:{periodDays:30}});
 assert.equal(result.status,200);assert.equal(result.data.source,"rules");
 assert.equal(await prisma.reservation.count({where:{companyId:a.user.companyId}}),before);
 assert.equal((await request("/ai/fleet-insights/explain",{method:"POST",body:{metrics:{loss:999}}})).status,400);
 }finally{delete app.locals.insightsProvider;}
});
