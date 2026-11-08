import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import {
  DEMO_USER_ID,
  demoEnabled,
  validGuest,
  limiter,
} from "../lib/public-demo.js";
const router = Router();
router.post("/session", limiter(30, 60000), async (req, res, next) => {
  res.set("Cache-Control", "no-store");
  if (!demoEnabled())
    return res
      .status(503)
      .json({
        error: {
          code: "DEMO_DISABLED",
          message: "Public demo is currently unavailable.",
        },
      });
  try {
    const user = await prisma.user.findUnique({
      where: { id: DEMO_USER_ID },
      include: { company: { select: { name: true } } },
    });
    if (!validGuest(user))
      return res
        .status(503)
        .json({
          error: {
            code: "DEMO_UNAVAILABLE",
            message: "Public demo is currently unavailable.",
          },
        });
    const token = jwt.sign(
      { id: user.id, companyId: user.companyId, demoGuest: true },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "15m",
        audience: "flowdesck-public-demo",
      },
    );
    res.json({
      token,
      user: {
        id: user.id,
        companyId: user.companyId,
        role: user.role,
        email: user.email,
      },
      expiresIn: 900,
    });
  } catch (error) {
    next(error);
  }
});
export default router;
