import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { protectRoute } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/permission.middleware.js";
import { route, invalid } from "../../lib/rental-errors.js";
import {
  object,
  uuid,
  choice,
  pagination,
  page,
  STATUSES,
} from "../../lib/rental-validation.js";
import { period } from "../../lib/rental-dates.js";
import {
  availability,
  getReservation,
  createReservation,
  updateReservation,
  reservationDTO,
  includeReservation,
} from "./reservations.service.js";
const router = Router();
router.use(protectRoute);
router.get(
  "/availability",
  route(async (req, res) =>
    res.json(await availability(req.user.companyId, req.query)),
  ),
);
router.get(
  "/",
  route(async (req, res) => {
    object(req.query, [
      "from",
      "to",
      "status",
      "vehicleId",
      "reservationId",
      "cursor",
      "limit",
    ]);
    const { take, orderBy, whereCursor } = pagination(req.query);
    const where = {
      companyId: req.user.companyId,
      ...whereCursor,
      ...(req.query.status
        ? { status: choice(req.query.status, STATUSES) }
        : {}),
      ...(req.query.vehicleId ? { vehicleId: uuid(req.query.vehicleId) } : {}),
      ...(req.query.reservationId ? { id: uuid(req.query.reservationId) } : {}),
    };
    if (req.query.from || req.query.to) {
      const dates = period(req.query.from, req.query.to);
      where.startDate = { lt: dates.endDate };
      where.endDate = { gt: dates.startDate };
    }
    res.json(
      page(
        await prisma.reservation.findMany({
          where,
          take,
          orderBy,
          include: includeReservation,
        }),
        take,
        reservationDTO,
      ),
    );
  }),
);
router.get(
  "/:id",
  route(async (req, res) =>
    res.json(
      reservationDTO(
        await getReservation(req.user.companyId, uuid(req.params.id)),
      ),
    ),
  ),
);
router.post(
  "/",
  requireRoles("ADMIN", "SUPER_ADMIN"),
  route(async (req, res) =>
    res.status(201).json(await createReservation(req.user.companyId, req.body)),
  ),
);
router.patch(
  "/:id",
  requireRoles("ADMIN", "SUPER_ADMIN"),
  route(async (req, res) =>
    res.json(
      await updateReservation(
        req.user.companyId,
        uuid(req.params.id),
        req.body,
      ),
    ),
  ),
);
router.patch(
  "/:id/status",
  requireRoles("ADMIN", "SUPER_ADMIN"),
  route(async (req, res) => {
    object(req.body, ["status", "expectedUpdatedAt"]);
    if (!req.body.status) invalid("status is required.");
    res.json(
      await updateReservation(
        req.user.companyId,
        uuid(req.params.id),
        req.body,
      ),
    );
  }),
);
export default router;
