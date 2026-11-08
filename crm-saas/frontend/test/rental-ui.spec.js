import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
test.describe.configure({ mode: "serial" });
let token, companyId, contactId, prisma, vehicleId;
const email = `ui-${randomUUID()}@rental.invalid`,
  password = "Browser-test-password-123";
const start = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Bucharest",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const later = (n) => {
  const d = new Date(start + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
test.beforeAll(async ({ request, baseURL }) => {
  if (!process.env.TEST_DATABASE_URL)
    throw new Error(
      "Disposable TEST_DATABASE_URL required for fixture cleanup.",
    );
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(baseURL))
    throw new Error(
      "Browser tests must target a local app backed by the same disposable DB.",
    );
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  ({ prisma } = await import("../../backend/src/lib/prisma.js"));
  const register = await request.post("/api/auth/register", {
    data: { email, password, companyName: "UI rental test" },
  });
  expect(register.status()).toBe(201);
  const login = await request.post("/api/auth/login", {
    data: { email, password },
  });
  const data = await login.json();
  token = data.token;
  companyId = data.user.companyId;
  // Refuse cleanup if the supplied database and API do not point to the same fixture.
  const owner = await prisma.user.findFirst({ where: { email, companyId } });
  if (!owner) throw new Error("API and test DB differ.");
  const contact = await request.post("/api/contacts", {
    headers: { Authorization: "Bearer " + token },
    data: { firstName: "Browser", lastName: "Customer" },
  });
  contactId = (await contact.json()).id;
});
test.afterAll(async () => {
  if (!prisma) return;
  if (companyId) {
    await prisma.reservation.deleteMany({ where: { companyId } });
    await prisma.vehicle.deleteMany({ where: { companyId } });
    await prisma.contact.deleteMany({ where: { tenantId: companyId } });
    await prisma.task.deleteMany({ where: { tenantId: companyId } });
    await prisma.user.deleteMany({ where: { companyId } });
    await prisma.company.delete({ where: { id: companyId } });
  }
  await prisma.$disconnect();
});
async function login(page) {
  await page.goto("/login");
  await page.getByRole("button",{name:"English",exact:true}).click();
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function createBooking(page) {
  await page
    .getByRole("button", { name: "New reservation", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Customer", { exact: true }).selectOption(contactId);
  await dialog.getByLabel("Rental start", { exact: true }).fill(later(2));
  await dialog
    .getByLabel("Rental end (exclusive)", { exact: true })
    .fill(later(4));
  await dialog
    .getByRole("button", { name: "Check available vehicles" })
    .click();
  await expect(
    dialog.getByText("€65.00", { exact: true }).first(),
  ).toBeVisible();
  await dialog.getByRole("radio").first().check();
  await dialog.getByRole("checkbox").check();
  const customer = dialog.getByLabel("Customer", { exact: true });
  await customer.selectOption("");
  await customer.selectOption(contactId);
  await expect(dialog.getByRole("checkbox")).not.toBeChecked();
  await expect(dialog.getByRole("button", { name: "Confirm reservation", exact: true })).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Confirm reservation", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
}
test("authenticate, empty state, vehicle form create/edit/details/search and duplicate feedback", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Fleet", exact: true }).click();
  await expect(page.getByText("Build your fleet")).toBeVisible();
  await page.getByRole("button", { name: "Add vehicle", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Brand", { exact: true }).fill("Dacia");
  await d.getByLabel("Model", { exact: true }).fill("BrowserCar");
  await d.getByLabel("License plate").fill("TM-UI-01");
  await d.getByLabel("Daily rate · EUR").fill("32.50");
  await d.getByRole("button", { name: "Save vehicle" }).click();
  await expect(d).not.toBeVisible();
  await expect(
    page.getByText("BrowserCar", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit TMUI01", exact: true }).click();
  await d.getByLabel("Model", { exact: true }).fill("BrowserCar Updated");
  await d.getByRole("button", { name: "Save vehicle" }).click();
  await expect(d).not.toBeVisible();
  await page.getByRole("button", { name: "View TMUI01", exact: true }).click();
  await expect(d.getByText("No reservations yet.")).toBeVisible();
  await d.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("searchbox").fill("no-such-car");
  await expect(page.getByText("No matching vehicles")).toBeVisible();
  await page.getByRole("searchbox").fill("");
  await page.getByRole("button", { name: "Add vehicle", exact: true }).click();
  await d.getByLabel("Brand", { exact: true }).fill("Duplicate");
  await d.getByLabel("Model", { exact: true }).fill("Car");
  await d.getByLabel("License plate").fill("TMUI01");
  await d.getByLabel("Daily rate · EUR").fill("20.00");
  await d.getByRole("button", { name: "Save vehicle" }).click();
  await expect(d.getByRole("alert")).toContainText("already exists");
  await d.getByRole("button", { name: "Cancel", exact: true }).click();
  const cars = await page.request.get("/api/vehicles", {
    headers: { Authorization: "Bearer " + token },
  });
  vehicleId = (await cars.json()).items[0].id;
});
test("real availability, human confirmation, edit price review, status cancellation releases booking", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Reservations", exact: true }).click();
  await createBooking(page);
  await expect(page.getByText("Browser Customer")).toBeVisible();
  await page.getByRole("button", { name: "Edit dates", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Rental end (exclusive)", { exact: true }).fill(later(5));
  await d.getByRole("button", { name: "Check available vehicles" }).click();
  await expect(d.getByText("€97.50", { exact: true }).first()).toBeVisible();
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Review & save changes" }).click();
  await expect(d).not.toBeVisible();
  await expect(page.getByText("€97.50", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await d.getByRole("button", { name: "Confirm cancelled" }).click();
  await expect(d).not.toBeVisible();
  await expect(
    page.getByText("Cancelled", { exact: true }).last(),
  ).toBeVisible();
  await createBooking(page);
});
test("stale availability returns a real booking conflict and clears the offer", async ({page}) => {
  await login(page); await page.goto('/reservations');
  await page.getByRole('button',{name:'New reservation',exact:true}).click();
  const d=page.getByRole('dialog');
  await d.getByLabel('Customer',{exact:true}).selectOption(contactId);
  await d.getByLabel('Rental start',{exact:true}).fill(later(10));
  await d.getByLabel('Rental end (exclusive)',{exact:true}).fill(later(12));
  await d.getByRole('button',{name:'Check available vehicles'}).click();
  await d.getByRole('radio').first().check(); await d.getByRole('checkbox').check();
  const competing=await page.request.post('/api/reservations',{headers:{Authorization:'Bearer '+token},data:{vehicleId,contactId,startDate:later(10),endDate:later(12),agreedTotal:'65.00',confirmed:true}});
  expect(competing.status()).toBe(201);
  await d.getByRole('button',{name:'Confirm reservation',exact:true}).click();
  await expect(d.getByRole('alert')).toContainText('already booked');
  await expect(d.getByRole('button',{name:'Confirm reservation',exact:true})).toBeDisabled();
  await d.getByRole('button',{name:'Close',exact:true}).click();
});
test("all protected/legacy deep links load, tasks submit, API error and loading states visible", async ({
  page,
}) => {
  await login(page);
  await page.getByLabel("New task").fill("Browser follow-up");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(
    page.getByText("Browser follow-up", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Complete Browser follow-up").check();
  await expect(page.getByLabel("Complete Browser follow-up")).toBeChecked();
  for (const [path, heading] of [
    ["/vehicles", "Your fleet, in focus."],
    ["/reservations", "Every booking, in order."],
    ["/copilot", "AI Booking Copilot"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
  }
  for (const path of ["/contacts", "/invoices", "/settings"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Fleet", exact: true }),
    ).toBeVisible();
  }
  await page.route("**/api/vehicles*", async (route) => {
    await new Promise((r) => setTimeout(r, 500));
    await route.fulfill({
      status: 503,
      json: { error: { message: "Temporary test outage" } },
    });
  });
  await page.goto("/vehicles");
  await expect(page.getByRole("status")).toContainText("Loading");
  await expect(page.getByRole("alert")).toContainText("Temporary test outage");
});
test("mobile navigation opens/closes and fleet has no page overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  const menu = page.getByRole("button", { name: "Main menu" });
  await expect(menu).toBeVisible();
  await menu.click();
  await page.getByRole("link", { name: "Fleet", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your fleet, in focus." }),
  ).toBeVisible();
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: "/tmp/flowdesck-fleet-mobile.png",
    fullPage: true,
  });
});

test("Copilot reviews a real offer and saves only after customer confirmation", async ({page}) => {
  // A separate loopback app enables a deterministic provider only in this test process.
  process.env.NODE_ENV = "production";
  process.env.JWT_SECRET = randomUUID();
  const { default: app } = await import("../../backend/src/app.js");
  const { extraction } = await import("../../backend/test/support/extraction.js");
  app.locals.bookingProvider = async ({inquiry}) => {
    expect(inquiry).toContain("BrowserCar Updated");
    return extraction({pickupText:later(24),returnText:later(26),preferredModel:"BrowserCar Updated"});
  };
  const server = app.listen(0,"127.0.0.1");
  await new Promise(resolve=>server.once("listening",resolve));
  const origin = "http://127.0.0.1:"+server.address().port;
  try {
    await page.goto(origin+"/login");
    await page.getByRole("button",{name:"English",exact:true}).click();
    await page.locator("input[type=email]").fill(email);
    await page.locator("input[type=password]").fill(password);
    await page.getByRole("button",{name:"Sign in"}).click();
    await page.getByRole("link",{name:"Booking Copilot"}).click();
    const before = await prisma.reservation.count({where:{companyId}});
    await page.getByLabel("Reply language").selectOption("en-GB");
    await page.getByLabel("Message",{exact:true}).fill(`BrowserCar Updated from ${later(24)} to ${later(26)}`);
    await page.getByRole("button",{name:"Analyze inquiry"}).click();
    await expect(page.getByText("Test provider",{exact:true})).toBeVisible();
    await expect(page.getByLabel("Editable draft")).toHaveValue(/65\.00/);
    await page.getByRole("button",{name:"Select vehicle"}).click();
    const customer=page.getByLabel("Customer",{exact:true});
    await customer.selectOption(contactId);
    const confirm=page.getByRole("button",{name:"Confirm reservation"});
    await expect(confirm).toBeDisabled();
    await page.getByRole("checkbox").check();
    await customer.selectOption("");
    await customer.selectOption(contactId);
    await expect(confirm).toBeDisabled();
    expect(await prisma.reservation.count({where:{companyId}})).toBe(before);
    await page.getByRole("checkbox").check();
    // A price change after selection must invalidate the quote at the locked POST.
    const localToken = await page.evaluate(() => localStorage.getItem("token"));
    const rateChange = await page.request.patch(origin + "/api/vehicles/" + vehicleId, {
      headers: { Authorization: "Bearer " + localToken }, data: { dailyRate: "34.50" },
    });
    expect(rateChange.status()).toBe(200);
    await confirm.click();
    await expect(page.getByRole("alert")).toContainText("69.00");
    expect(await prisma.reservation.count({where:{companyId}})).toBe(before);
    await page.getByRole("button",{name:"Refresh offers"}).click();
    await page.getByRole("button",{name:"Select vehicle"}).click();
    await customer.selectOption(contactId);
    await expect(confirm).toBeDisabled();
    await page.getByRole("checkbox").check();
    await confirm.click();
    await page.getByRole("link",{name:"View reservation"}).click();
    await expect(page.getByRole("row").filter({hasText:"Browser Customer"})).toBeVisible();
    const rows=await prisma.reservation.findMany({where:{companyId,vehicleId,contactId,startDate:new Date(later(24))}});
    expect(rows).toHaveLength(1); expect(rows[0].agreedTotal.toFixed(2)).toBe("69.00");
  } finally {
    delete app.locals.bookingProvider;
    await new Promise(resolve=>server.close(resolve));
  }
});

test("Fleet Intelligence shows real alerts, links and confirms an insurance reminder",async({page})=>{
 await prisma.vehicle.update({where:{id:vehicleId},data:{insuranceExpiration:new Date(later(5)),createdAt:new Date(later(-60))}});
 await login(page);
 await page.getByRole("link",{name:"Fleet Intelligence"}).click();
 await expect(page.getByRole("heading",{name:"Fleet Intelligence",exact:true})).toBeVisible();
 await expect(page.getByText("MEDIUM priority · Insurance date approaching")).toBeVisible();
 await page.getByRole("button",{name:"Generate AI Briefing"}).click();
 await expect(page.getByText("Rule-based analysis — AI explanation unavailable.",{exact:true})).toBeVisible();
 await page.getByRole("link",{name:"Review vehicle",exact:true}).click();
 await expect(page.getByRole("dialog")).toBeVisible();
 await page.goto("/insights");
 const count=await prisma.task.count({where:{tenantId:companyId}});
 await page.getByRole("button",{name:"Create reminder",exact:true}).click();
 expect(await prisma.task.count({where:{tenantId:companyId}})).toBe(count);
 await page.getByRole("button",{name:"Confirm reminder",exact:true}).click();
 await expect(page.getByRole("button",{name:"Reminder exists"})).toBeDisabled();
 expect(await prisma.task.count({where:{tenantId:companyId}})).toBe(count+1);
 await page.reload();await expect(page.getByRole("button",{name:"Reminder exists"})).toBeDisabled();
 await page.screenshot({path:"/tmp/flowdesck-insights-desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:"/tmp/flowdesck-insights-mobile.png",fullPage:true});
});

test("Romanian default, public roadmap navigation, bilingual refresh and authentication", async ({page}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang","ro");
  await expect(page.getByRole("heading",{level:1})).toContainText("Administrează inteligent");
  await expect(page.locator('a[href="/business-plan"]')).toHaveCount(0);
  await page.goto("/business-plan");
  await page.getByRole("button",{name:"Anul 5"}).click();
  await expect(page.getByText("Obiectiv · 3.000 de companii plătitoare",{exact:true})).toBeVisible();
  await page.getByRole("button",{name:"English",exact:true}).click();
  await expect(page.getByText("Target · 3,000 paying companies",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading",{name:"Business plan",exact:true})).toBeVisible();
  await page.goto("/register");
  await expect(page.getByLabel("Company name")).toBeVisible();
  await login(page);
  await page.getByRole("button",{name:"Sign out"}).click();
  await expect(page.getByRole("heading",{name:"Welcome back"})).toBeVisible();
});

test("customer create, edit, status filter, rental history and delete", async ({page}) => {
  await login(page);
  await page.goto("/contacts");
  await page.getByRole("button",{name:"Add customer"}).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First name").fill("Test");
  await dialog.getByLabel("Last name").fill("Renter");
  await dialog.getByLabel("Phone").fill("0700000000");
  await dialog.getByRole("button",{name:"Save customer"}).click();
  let row = page.getByRole("row").filter({hasText:"Test Renter"});
  await row.getByRole("button",{name:"Edit"}).click();
  await dialog.getByLabel("Status").selectOption("ACTIVE");
  await dialog.getByRole("button",{name:"Save customer"}).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel("Status",{exact:true}).selectOption("ACTIVE");
  await row.getByRole("link",{name:"Reservations"}).click();
  await expect(page.getByText("No reservations to show")).toBeVisible();
  await page.goto("/contacts");
  await page.getByRole("searchbox").fill("0700000000");
  await expect(row).toContainText("Active");
  page.once("dialog", d=>d.accept());
  await row.getByRole("button",{name:"Delete"}).click();
  await expect(row).toHaveCount(0);
});

test("every route renders in both languages at phone, tablet and desktop widths", async ({page}) => {
  test.setTimeout(120000);
  await login(page);
  const failures=[];
  page.on("pageerror",e=>failures.push(e.message));
  const routes=[
    ["/","Administrează inteligent","Run your rental business smarter."],["/business-plan","Plan de afaceri","Business plan"],
    ["/login","Bine ai revenit","Welcome back"],["/register","Creează spațiul de lucru","Create your workspace"],
    ["/dashboard","Flota ta astăzi","A clear view of the road ahead."],["/contacts","Clienți","Customers"],
    ["/vehicles","Flota de vehicule","Your fleet, in focus."],["/reservations","Rezervări","Every booking, in order."],
    ["/invoices","Facturi","Invoices"],["/settings","Setările companiei","Workspace settings"],
    ["/copilot","Asistent AI de rezervări","AI Booking Copilot"],["/insights","Analiza flotei","Fleet Intelligence"]];
  for(const [language,column] of [["Română",1],["English",2]]){
    await page.goto("/");
    await page.getByRole("button",{name:language,exact:true}).click();
    for(const width of [375,820,1440]){
      await page.setViewportSize({width,height:900});
      for(const route of routes){
        await page.goto(route[0]);
        await expect(page.getByRole("heading",{level:1})).toContainText(route[column]);
        await expect(page.locator(".r-loading")).toHaveCount(0);
        await expect(page.locator('a[href="/business-plan"]')).toHaveCount(0);
        if(route[0] !== "/business-plan") expect(await page.locator("body").innerText()).not.toMatch(/\bCRM\b/i);
        if(route[0] === "/dashboard") await expect(page.locator('a[href="/invoices"]')).toHaveCount(1);
        const layout = await page.evaluate(()=>({
          width: document.documentElement.scrollWidth,
          overflowing: [...document.querySelectorAll("main *")].filter(el => el.getBoundingClientRect().right > innerWidth && !el.closest(".r-table-wrap")).map(el=>el.className || el.tagName).slice(0,12)
        }));
        expect(layout.width,route[0]+" "+width+" "+JSON.stringify(layout)).toBeLessThanOrEqual(width);
        if(width!==820 && column===1 && ["/","/contacts","/dashboard"].includes(route[0]))
          await page.screenshot({path:"/tmp/flowdesck-review-"+width+"-"+(route[0].slice(1)||"landing")+".png"});
      }
    }
  }
  expect(failures).toEqual([]);
});

test("AI requests follow the selected language and keep manual results explicit", async ({page}) => {
  await login(page);
  await page.goto("/copilot");
  await page.getByRole("button",{name:"Română",exact:true}).click();
  await page.getByLabel("Mesaj",{exact:true}).fill("Aș dori să închiriez o mașină automată.");
  const proposal = page.waitForRequest(r=>r.method()==="POST" && r.url().endsWith("/ai/booking-proposals"));
  await page.getByRole("button",{name:"Analizează cererea"}).click();
  expect((await proposal).postDataJSON().locale).toBe("ro-RO");
  await expect(page.getByText("Căutare asistată manual",{exact:true})).toBeVisible();
  await page.goto("/insights");
  for(const [language,button,locale] of [["Română","Generează sinteza AI","ro-RO"],["English","Generate AI Briefing","en-GB"]]){
    await page.getByRole("button",{name:language,exact:true}).click();
    const briefing=page.waitForRequest(r=>r.method()==="POST" && r.url().endsWith("/ai/fleet-insights/explain"));
    await page.getByRole("button",{name:button}).click();
    expect((await briefing).postDataJSON().locale).toBe(locale);
    await expect(page.getByText(locale==="ro-RO"?"Analiză bazată pe reguli · explicația AI este indisponibilă.":"Rule-based analysis — AI explanation unavailable.",{exact:true})).toBeVisible();
  }
});
