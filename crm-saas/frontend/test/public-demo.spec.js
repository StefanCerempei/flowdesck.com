import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
let prisma, server, origin, company;
const guestId = "a6fd48bc-533d-45f8-96cc-284928097f67";
test.beforeAll(async () => {
  if (!process.env.TEST_DATABASE_URL)
    throw Error("Disposable database required");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET ||= randomUUID();
  ({ prisma } = await import("../../backend/src/lib/prisma.js"));
  if (await prisma.user.findUnique({ where: { id: guestId } }))
    throw Error("Guest fixture collision");
  company = await prisma.company.create({ data: { name: "Timiș Rent Demo" } });
  await prisma.user.create({
    data: {
      id: guestId,
      email: "jury-guest@flowdesck.test",
      role: "DEMO_GUEST",
      companyId: company.id,
      password: "unusable",
    },
  });
  await prisma.contact.create({
    data: { tenantId: company.id, firstName: "Jury", lastName: "Customer" },
  });
  await prisma.task.create({
    data: { tenantId: company.id, title: "Jury follow-up" },
  });
  process.env.PUBLIC_DEMO_COMPANY_ID = company.id;
  const { default: app } = await import("../../backend/src/app.js");
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  origin = "http://127.0.0.1:" + server.address().port;
});
test.afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (company) {
    await prisma.contact.deleteMany({ where: { tenantId: company.id } });
    await prisma.task.deleteMany({ where: { tenantId: company.id } });
    await prisma.user.deleteMany({ where: { companyId: company.id } });
    await prisma.company.delete({ where: { id: company.id } });
  }
  await prisma?.$disconnect();
});
test("disabled page, automatic mobile guest entry, RO/EN, refresh, disabled legacy writes and logout", async ({
  page,
}) => {
  delete process.env.PUBLIC_DEMO_ENABLED;
  await page.goto(origin + "/demo");
  await expect(
    page.getByRole("heading", { name: "Demo indisponibil" }),
  ).toBeVisible();
  process.env.PUBLIC_DEMO_ENABLED = "true";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + "/demo");
  await expect(page).toHaveURL(origin + "/dashboard");
  await expect(
    page.getByText("Mod demo — doar vizualizare", { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel("Sarcină nouă")).toBeDisabled();
  await expect(page.getByLabel("Finalizează Jury follow-up")).toBeDisabled();
  await page.getByRole("button", { name: "Meniu principal" }).click();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.goto(origin + "/contacts");
  await expect(
    page.getByRole("button", { name: "Add customer" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Edit", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByText("Demo Mode — Read Only", { exact: false }),
  ).toBeVisible();
  await page.goto(origin + "/invoices");
  await expect(
    page.getByRole("button", { name: "Issue invoice" }),
  ).toBeDisabled();
  await page.goto(origin + "/settings");
  await expect(page.getByLabel("Company name")).toBeDisabled();
  const state = await page.evaluate(() => ({
    demo: JSON.parse(sessionStorage.getItem("flowdesck.demo")),
    persistent: localStorage.getItem("token"),
  }));
  expect(state.demo.user.role).toBe("DEMO_GUEST");
  expect(state.persistent).toBeNull();
  const denied = await page.request.post(origin + "/api/contacts", {
    headers: { Authorization: "Bearer " + state.demo.token },
    data: { firstName: "No", lastName: "Write" },
  });
  expect(denied.status()).toBe(403);
  await page.getByRole("button", { name: "Main menu" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  expect(
    await page.evaluate(() => sessionStorage.getItem("flowdesck.demo")),
  ).toBeNull();
});
