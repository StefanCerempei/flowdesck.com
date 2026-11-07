import { Prisma } from "@prisma/client";
import { period, today } from "../../lib/rental-dates.js";
import { availability } from "../reservations/reservations.service.js";
import { object, choice, text } from "../../lib/rental-validation.js";
import { cleanFields, decode, emptyIntent, fold } from "./intent.js";
import { extractGemini } from "./gemini.client.js";

export async function propose(companyId, body, provider = extractGemini) {
  object(body, ["inquiry", "locale", "clarifications", "manual"]);
  const inquiry = text(body.inquiry, 2000);
  const locale = choice(body.locale === undefined ? "ro-RO" : body.locale, [
    "ro-RO",
    "en-GB",
    "en-US",
  ]);
  if (body.manual !== undefined) choice(body.manual, [true, false]);
  const reviewed = cleanFields(
    body.clarifications === undefined ? {} : body.clarifications,
  );
  const day = today(),
    ro = locale === "ro-RO";
  const say = (en, romanian) => (ro ? romanian : en);
  let intent = emptyIntent(),
    isRental = true,
    source = "local";
  const warnings = [];
  if (!body.manual) {
    try {
      const raw = await provider({ inquiry, day, locale });
      ({ intent, isRental } = decode(raw, inquiry, day));
      source = provider === extractGemini ? "gemini" : "test";
    } catch {
      warnings.push(
        say(
          "AI unavailable. Review the rental details manually.",
          "AI indisponibil. Verificați manual detaliile închirierii.",
        ),
      );
    }
  }
  Object.assign(intent, reviewed);
  const missingFields = [];
  if (!intent.startDate || intent.startDate < day)
    missingFields.push("startDate");
  if (!intent.endDate) missingFields.push("endDate");
  if (!missingFields.length) {
    try {
      period(intent.startDate, intent.endDate);
    } catch {
      missingFields.push("endDate");
    }
  }
  if (intent.maxTotalBudget && intent.currency !== "EUR")
    missingFields.push("currency");
  const result = {
    source,
    extracted: intent,
    missingFields,
    clarificationQuestion: null,
    warnings,
    offers: [],
    replyDraft: "",
    checkedAt: null,
    requiresHumanConfirmation: true,
  };
  if (!isRental) {
    result.replyDraft = say(
      "Please send a rental inquiry with pickup and return dates.",
      "Vă rugăm să trimiteți o cerere de închiriere cu datele de preluare și returnare.",
    );
    return result;
  }
  if (missingFields.length) {
    const questions = {
      startDate: say("What is the pickup date?", "Care este data preluării?"),
      endDate: say(
        "What is the return date? Please give a date after pickup, within 365 days.",
        "Care este data returnării? Alegeți o dată după preluare, în maximum 365 de zile.",
      ),
      currency: say(
        "What is your maximum total budget in EUR?",
        "Care este bugetul total maxim în EUR?",
      ),
    };
    result.replyDraft = result.clarificationQuestion = missingFields
      .map((k) => questions[k])
      .join(" ");
    return result;
  }
  if (intent.pickupLocation)
    warnings.push(
      say(
        "Confirm the pickup location separately.",
        "Confirmați separat locul preluării.",
      ),
    );
  const quotes = await availability(companyId, {
    startDate: intent.startDate,
    endDate: intent.endDate,
  });
  result.checkedAt = quotes.checkedAt;
  for (const { vehicle, total } of quotes.items) {
    if (
      intent.maxTotalBudget &&
      new Prisma.Decimal(total).gt(intent.maxTotalBudget)
    )
      continue;
    const mismatches = [];
    for (const [field, key] of [
      ["preferredBrand", "brand"],
      ["preferredModel", "model"],
      ["category", "category"],
      ["transmission", "transmission"],
    ]) {
      if (intent[field] && fold(vehicle[key]) !== fold(intent[field]))
        mismatches.push(key);
    }
    const alternative = mismatches.length > 0;
    const name = vehicle.brand + " " + vehicle.model;
    const dates = intent.startDate + " – " + intent.endDate;
    const replyDraft = say(
      `Hello! ${alternative ? "As an alternative, we have" : "We have"} a ${name} (${vehicle.transmission.toLowerCase()}) available for ${dates}. The rental total is EUR ${total}. Would you like to proceed?`,
      `Bună ziua! ${alternative ? "Ca alternativă, vă putem oferi" : "Vă putem oferi"} un ${name} (cutie ${vehicle.transmission === "MANUAL" ? "manuală" : "automată"}) pentru ${dates}. Prețul total este de ${total} EUR. Doriți să continuăm cu rezervarea?`,
    );
    result.offers.push({
      vehicleId: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      category: vehicle.category,
      transmission: vehicle.transmission,
      dailyRate: vehicle.dailyRate,
      billedDays: quotes.billedDays,
      total,
      currency: "EUR",
      mismatches,
      replyDraft,
    });
  }
  result.offers.sort(
    (a, b) =>
      a.mismatches.length - b.mismatches.length ||
      new Prisma.Decimal(a.total).cmp(b.total),
  );
  if (result.offers.some((o) => !o.mismatches.length))
    result.offers = result.offers.filter((o) => !o.mismatches.length);
  result.replyDraft =
    result.offers[0]?.replyDraft ||
    say(
      "We have no available vehicle within the supplied dates and budget. Would you like to review the dates or budget?",
      "Nu avem un vehicul disponibil pentru perioada și bugetul indicate. Doriți să revizuim perioada sau bugetul?",
    );
  return result;
}
