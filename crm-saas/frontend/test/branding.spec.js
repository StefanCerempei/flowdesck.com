import { test, expect } from "@playwright/test";

test("unlisted Business Plan remains public, refreshable and excluded from indexing", async ({
  page,
  request,
}) => {
  const response = await request.get("/business-plan");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  await page.goto("/business-plan");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Plan de afaceri",
  );
  await expect(page.locator("meta[name=robots]")).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await page.getByRole("button", { name: "Anul 5", exact: true }).click();
  await expect(
    page.getByText("Obiectiv · 3.000 de companii plătitoare", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Plan de afaceri",
  );
  await page.getByRole("link", { name: "Flowdesck", exact: true }).click();
  await expect(page.locator("meta[name=robots]")).toHaveCount(0);
  expect((await request.get("/")).headers()["x-robots-tag"]).toBeUndefined();
});

test("bilingual rental branding, demo CTA and navigation at every viewport", async ({
  page,
}) => {
  for (const width of [390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [language, headline, cta] of [
      [
        "Română",
        "Administrează inteligent afacerea ta de închirieri auto.",
        "Încearcă demo-ul",
      ],
      ["English", "Run your rental business smarter.", "Explore Live Demo"],
    ]) {
      await page.goto("/");
      await page.getByRole("button", { name: language, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        headline,
      );
      await expect(page.locator('a[href="/business-plan"]')).toHaveCount(0);
      expect(await page.locator("body").innerText()).not.toMatch(/\bCRM\b/i);
      await expect(page.getByRole("link", { name: cta })).toHaveAttribute(
        "href",
        "/demo",
      );
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      if (language === "Română")
        await page.screenshot({
          path: "/tmp/branding-landing-" + width + ".png",
          fullPage: true,
        });
      await page.getByRole("link", { name: cta }).click();
      await expect(page).toHaveURL(/\/demo$/);
      await expect(page.locator("main h1")).toBeVisible();
    }
  }
});
