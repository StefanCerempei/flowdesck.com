import { Router } from "express";
import { prisma } from "../../lib/prisma.js";
import { protectRoute } from "../../middleware/auth.middleware.js";
import { requireRoles } from "../../middleware/permission.middleware.js";
import { route } from "../../lib/rental-errors.js";
import {
  object,
  uuid,
  choice,
  pagination,
  page,
  vehicleBody,
  VEHICLE_STATUSES,
  CATEGORIES,
} from "../../lib/rental-validation.js";
import {
  vehicleDTO,
  getVehicle,
  createVehicle,
  updateVehicle,
} from "./vehicles.service.js";
import { availability } from "../reservations/reservations.service.js";
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
    object(req.query, ["status", "category", "cursor", "limit", "search"]);
    const { take, orderBy, whereCursor } = pagination(req.query);
    const where = {
      companyId: req.user.companyId,
      ...whereCursor,
      ...(req.query.status
        ? { status: choice(req.query.status, VEHICLE_STATUSES) }
        : {}),
      ...(req.query.category
        ? { category: choice(req.query.category, CATEGORIES) }
        : {}),
    };
    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 80);
      where.OR = ["brand", "model", "licensePlate"].map((k) => ({
        [k]: {
          contains:
            k === "licensePlate"
              ? search.toUpperCase().replace(/[\s-]/g, "")
              : search,
        },
      }));
    }
    const [rows, groups] = await Promise.all([
      prisma.vehicle.findMany({ where, take, orderBy }),
      prisma.vehicle.groupBy({
        by: ["status"],
        where: { companyId: req.user.companyId },
        _count: true,
      }),
    ]);
    const summary = { total: 0, AVAILABLE: 0, MAINTENANCE: 0, INACTIVE: 0 };
    for (const g of groups) {
      summary[g.status] = g._count;
      summary.total += g._count;
    }
    res.json({ ...page(rows, take, vehicleDTO), summary });
  }),
);
router.get(
  "/:id",
  route(async (req, res) =>
    res.json(await getVehicle(req.user.companyId, uuid(req.params.id))),
  ),
);
router.post(
  "/",
  requireRoles("ADMIN", "SUPER_ADMIN"),
  route(async (req, res) =>
    res
      .status(201)
      .json(await createVehicle(req.user.companyId, vehicleBody(req.body))),
  ),
);
router.patch(
  "/:id",
  requireRoles("ADMIN", "SUPER_ADMIN"),
  route(async (req, res) =>
    res.json(
      await updateVehicle(
        req.user.companyId,
        uuid(req.params.id),
        vehicleBody(req.body, true),
      ),
    ),
  ),
);
router.delete(
  "/:id",
  requireRoles("ADMIN", "SUPER_ADMIN"),
  route(async (req, res) => {
    await getVehicle(req.user.companyId, uuid(req.params.id));
    res
      .set("Allow", "GET, PATCH")
      .status(405)
      .json({
        error: {
          code: "ARCHIVE_REQUIRED",
          message:
            "Vehicles cannot be deleted. Mark the vehicle INACTIVE to preserve reservation history.",
        },
      });
  }),
);
// Archive-only policy: no hard delete, preserving all reservation history.
export default router;
