import { Router } from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import { route, RentalError } from "../../lib/rental-errors.js";
import { getInsights } from "./insights.service.js";
import { explain } from "./explanation.js";
const router = Router(),
  budgets = new Map();
router.use(protectRoute);
router.get(
  "/fleet-insights",
  route(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(await getInsights(req.user.companyId, req.query));
  }),
);
router.post(
  "/fleet-insights/explain",
  route(async (req, res) => {
    const now = Date.now(),
      id = req.user.companyId;
    for (const [key, b] of budgets) if (b.until <= now) budgets.delete(key);
    const budget = budgets.get(id) || { count: 0, until: now + 60000 };
    if (budget.count >= 5) {
      res.set("Retry-After", String(Math.ceil((budget.until - now) / 1000)));
      throw new RentalError(
        429,
        "RATE_LIMIT",
        "Please wait before generating another briefing.",
      );
    }
    budget.count++;
    budgets.set(id, budget);
    res.set("Cache-Control", "no-store");
    res.json(await explain(id, req.body, req.app.locals.insightsProvider));
  }),
);
export default router;
