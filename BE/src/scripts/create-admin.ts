import "dotenv/config";
import { z } from "zod";
import prisma from "../config/database";
import { hashPassword } from "../auth/password";

async function main() {
  const input = z.object({
    BOOTSTRAP_EMAIL: z.string().email().transform(value => value.toLowerCase()),
    BOOTSTRAP_PASSWORD: z.string().min(14).max(256).optional(),
    BOOTSTRAP_ORGANIZATION: z.string().min(1).max(200).default("My business"),
    BOOTSTRAP_ORGANIZATION_ID: z.string().min(1).optional(),
  }).parse(process.env);
  if (await prisma.user.findUnique({ where: { email: input.BOOTSTRAP_EMAIL } })) {
    console.log("Administrator already exists; no account changes were made.");
    return;
  }
  if (!input.BOOTSTRAP_PASSWORD) throw new Error("BOOTSTRAP_PASSWORD is required until the administrator account is created.");
  const passwordHash = await hashPassword(input.BOOTSTRAP_PASSWORD);
  await prisma.$transaction(async tx => {
    if (await tx.user.findUnique({ where: { email: input.BOOTSTRAP_EMAIL } })) return;
    const organization = input.BOOTSTRAP_ORGANIZATION_ID
      ? await tx.organization.findUniqueOrThrow({ where: { id: input.BOOTSTRAP_ORGANIZATION_ID } })
      : await tx.organization.create({ data: { name: input.BOOTSTRAP_ORGANIZATION } });
    await tx.user.create({ data: { organizationId: organization.id, email: input.BOOTSTRAP_EMAIL, passwordHash, role: "ADMIN" } });
  });
  console.log("Administrator bootstrap complete. Existing accounts are never modified.");
}
main().catch(() => { console.error("Administrator setup failed. Verify bootstrap settings, database availability, and that the account does not already exist."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
