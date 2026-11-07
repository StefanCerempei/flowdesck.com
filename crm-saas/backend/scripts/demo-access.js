import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { readFile, writeFile, rename, chmod } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/lib/prisma.js";
import { assertDemoTarget } from "./seed-rental-demo.js";
const h = createHash("sha256")
  .update("flowdesck-timis-rental-demo-v1:company")
  .digest("hex");
const companyId = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
const email = "demo@flowdesck.test";
export const credentialPath = fileURLToPath(
  new URL("../.env.demo-login.json", import.meta.url),
);
export async function ensureDemoAccess(reset = false) {
  assertDemoTarget();
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (company?.name !== "Timiș Rent Demo")
    throw new Error("Expected seeded demo company is missing.");
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.companyId !== companyId)
    throw new Error("Email belongs to another company.");
  let saved;
  try {
    saved = JSON.parse(await readFile(credentialPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (user && !reset) {
    if (
      !saved ||
      saved.email !== email ||
      !(await bcrypt.compare(saved.password, user.password))
    )
      throw new Error("Use demo:reset-password to generate local credentials.");
    if (user.role !== "SUPER_ADMIN") throw new Error("Demo role needs review.");
    await chmod(credentialPath, 0o600);
    return;
  }
  const password = randomBytes(24).toString("base64url");
  const temporary = credentialPath + ".pending";
  await writeFile(
    temporary,
    JSON.stringify({ email, password }, null, 2) + "\n",
    { mode: 0o600 },
  );
  await chmod(temporary, 0o600);
  try {
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        companyId,
        role: "SUPER_ADMIN",
        password: await bcrypt.hash(password, 10),
      },
      update: {
        password: await bcrypt.hash(password, 10),
        role: "SUPER_ADMIN",
      },
    });
    await rename(temporary, credentialPath);
  } catch {
    throw new Error(
      "Demo credential update failed. Retry reset locally; pending credentials are private.",
    );
  }
}
if (
  process.argv[1] &&
  import.meta.url === new URL("file://" + process.argv[1]).href
) {
  try {
    await ensureDemoAccess(process.argv.includes("--reset"));
    console.log("Demo login ready. Read the local .env.demo-login.json file.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
