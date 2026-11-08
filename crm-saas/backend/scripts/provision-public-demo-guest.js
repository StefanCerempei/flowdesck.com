// Explicit operator CLI. Does not load .env or create tenants/fixtures.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  DEMO_USER_ID,
  DEMO_EMAIL,
  DEMO_ROLE,
  DEMO_NAME,
} from "../src/lib/public-demo.js";

const apply = process.argv[2] === "--apply";
const database = "u895273058_database";
const fail = (message) => {
  throw new Error(message);
};
const db = new PrismaClient({ log: [] });
try {
  if (
    !["--dry-run", "--apply"].includes(process.argv[2]) ||
    process.argv.length !== 3
  )
    fail("Use --dry-run or --apply.");
  const target = new URL(process.env.DATABASE_URL || "");
  if (decodeURIComponent(target.pathname.slice(1)) !== database)
    fail("Unexpected database.");
  const companyId = process.env.PUBLIC_DEMO_COMPANY_ID;
  if (!/^[0-9a-f-]{36}$/i.test(companyId || ""))
    fail("Set the reviewed PUBLIC_DEMO_COMPANY_ID.");
  if (
    apply &&
    process.env.CONFIRM_PUBLIC_DEMO_GUEST !==
      "CREATE_READ_ONLY_GUEST_ON_u895273058_database"
  )
    fail("Explicit operator confirmation required.");
  const inspect = async (tx) => {
    const identity = await tx.$queryRaw`SELECT DATABASE() AS name`;
    if (identity[0]?.name !== database) fail("Database identity mismatch.");
    const company = await tx.company.findUnique({ where: { id: companyId } });
    const owner = await tx.user.findUnique({
      where: { email: "demo@flowdesck.test" },
    });
    const names = await tx.company.count({ where: { name: DEMO_NAME } });
    if (
      company?.name !== DEMO_NAME ||
      names !== 1 ||
      owner?.companyId !== companyId ||
      owner.role !== "SUPER_ADMIN"
    )
      fail("Existing demo tenant and owner must match exactly.");
    const collisions = await tx.user.findMany({
      where: { OR: [{ id: DEMO_USER_ID }, { email: DEMO_EMAIL }] },
    });
    if (
      collisions.length &&
      (collisions.length !== 1 ||
        collisions[0].id !== DEMO_USER_ID ||
        collisions[0].email !== DEMO_EMAIL ||
        collisions[0].companyId !== companyId ||
        collisions[0].role !== DEMO_ROLE)
    )
      fail("Guest identity collision.");
    return collisions.length === 1;
  };
  if (!apply) {
    const exists = await inspect(db);
    console.log(
      exists
        ? "Verified existing restricted guest. No changes."
        : "Dry run passed. Would create one restricted guest user.",
    );
  } else {
    const password = await bcrypt.hash(
      randomBytes(48).toString("base64url"),
      12,
    );
    const result = await db.$transaction(async (tx) => {
      if (await inspect(tx))
        return "Existing restricted guest verified. No changes.";
      await tx.user.create({
        data: {
          id: DEMO_USER_ID,
          email: DEMO_EMAIL,
          role: DEMO_ROLE,
          companyId,
          password,
        },
      });
      if (!(await inspect(tx))) fail("Guest verification failed.");
      return "Created and verified one restricted guest. Random password discarded.";
    });
    console.log(result);
  }
} catch (error) {
  // Never log driver errors or connection strings.
  console.error(
    error instanceof Error &&
      !error.code &&
      !error.name.startsWith("Prisma") &&
      !error.message.includes("://")
      ? error.message
      : "Provisioning refused or failed. Review configuration and database access.",
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
