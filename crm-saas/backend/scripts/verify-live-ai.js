import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma.js";
import { propose } from "../src/modules/ai/booking.service.js";
import { explain } from "../src/modules/insights/explanation.js";
import { availability } from "../src/modules/reservations/reservations.service.js";
import { today, addDays } from "../src/lib/rental-dates.js";

try {
  if (!process.env.GEMINI_API_KEY)
    throw new Error("GEMINI_API_KEY is missing.");
  const url = new URL(process.env.DATABASE_URL);
  if (
    !["127.0.0.1", "localhost"].includes(url.hostname) ||
    !url.pathname.endsWith("_test")
  )
    throw new Error(
      "Live verification requires the local disposable test database.",
    );
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "demo@flowdesck.test" },
    include: { company: true },
  });
  assert.equal(user.company.name, "Timiș Rent Demo");
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const metadata = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model),
    {
      headers: { "x-goog-api-key": process.env.GEMINI_API_KEY },
      signal: AbortSignal.timeout(12000),
    },
  );
  assert.equal(
    metadata.status,
    200,
    "Configured model is unavailable for this key.",
  );
  assert.ok(
    (await metadata.json()).supportedGenerationMethods.includes(
      "generateContent",
    ),
  );
  const startDate = addDays(today(), 5),
    endDate = addDays(today(), 8);
  const before = await prisma.reservation.count({
    where: { companyId: user.companyId },
  });
  const inventory = await availability(user.companyId, { startDate, endDate });
  for (const [locale, inquiry] of [
    [
      "ro-RO",
      `Doresc un Volkswagen automat din ${startDate} până în ${endDate}, buget total maxim 200 EUR.`,
    ],
    [
      "en-GB",
      `An automatic Volkswagen from ${startDate} to ${endDate}, maximum total budget 200 EUR.`,
    ],
  ]) {
    const result = await propose(user.companyId, { inquiry, locale });
    assert.equal(
      result.source,
      "gemini",
      "Extraction fell back. Inspect key, quota and model compatibility.",
    );
    assert.equal(result.extracted.startDate, startDate);
    assert.equal(result.extracted.endDate, endDate);
    assert.equal(result.extracted.transmission, "AUTOMATIC");
    assert.equal(result.extracted.preferredBrand, "Volkswagen");
    assert.equal(result.extracted.maxTotalBudget, "200.00");
    assert.ok(
      result.offers.length,
      "Rehearsal interval has no eligible offers.",
    );
    for (const offer of result.offers) {
      const quote = inventory.items.find(
        (item) => item.vehicle.id === offer.vehicleId,
      );
      assert.ok(quote);
      assert.equal(offer.total, quote.total);
    }
    console.log(locale + " live extraction and database pricing VERIFIED.");
  }
  const briefing = await explain(user.companyId, {
    periodDays: 30,
    locale: "en-GB",
  });
  assert.equal(briefing.source, "gemini", "Briefing fell back.");
  for (const recommendation of briefing.recommendations)
    assert.ok(briefing.insights.some((i) => i.id === recommendation.findingId));
  assert.equal(
    await prisma.reservation.count({ where: { companyId: user.companyId } }),
    before,
  );
  console.log("Live briefing and zero reservation writes VERIFIED.");
} catch {
  console.error(
    "Live verification FAILED. Check the private backend environment, provider access, demo inventory and source labels. No credentials or provider response were logged.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
