import { offlineDemoProvider } from "../../lib/public-demo.js";
import { Router } from "express";
import { protectRoute } from "../../middleware/auth.middleware.js";
import { RentalError, route } from "../../lib/rental-errors.js";
import { propose } from "./booking.service.js";

const router = Router();
const budgets = new Map();
router.post(
  "/booking-proposals",
  protectRoute,
  route(async (req, res) => {
    const companyId = req.user.companyId,
      now = Date.now();
    for (const [id, budget] of budgets)
      if (budget.until <= now) budgets.delete(id);
    const budget = budgets.get(companyId) || { until: now + 60000, count: 0 };
    if (budget.count >= 12) {
      res.set("Retry-After", String(Math.ceil((budget.until - now) / 1000)));
      throw new RentalError(
        429,
        "RATE_LIMIT",
        "Too many proposals. Try again in a minute.",
      );
    }
    budget.count++;
    budgets.set(companyId, budget);
    res.set("Cache-Control", "no-store");
    res.json(
      await propose(companyId, req.body, req.demoGuest ? offlineDemoProvider : req.app.locals.bookingProvider),
    );
  }),
);
export default router;
