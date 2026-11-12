import "dotenv/config";
import { UserRole } from "@prisma/client";
import prisma from "../config/database";
import { hashPassword } from "../services/auth.service";

const roles = new Set<string>(Object.values(UserRole));

async function main() {
  const email = process.env.USER_EMAIL?.trim().toLowerCase();
  const password = process.env.USER_PASSWORD;
  const requestedRole = process.env.USER_ROLE || "OPERATOR";
  const organizationId = process.env.USER_ORGANIZATION_ID;
  const organizationName = process.env.USER_ORGANIZATION_NAME?.trim();

  if (!email || !password || password.length < 14 || password.length > 200) throw new Error("Set USER_EMAIL and USER_PASSWORD (14–200 characters). Do not put these values in source control.");
  if (!roles.has(requestedRole)) throw new Error("USER_ROLE must be ADMIN, OPERATOR, or VIEWER.");
  if (await prisma.user.findUnique({ where: { email } })) throw new Error("A user with that email already exists.");

  let orgId = organizationId;
  if (orgId) {
    const existing = await prisma.organization.findUnique({ where: { id: orgId }, select: { id: true } });
    if (!existing) throw new Error("USER_ORGANIZATION_ID does not match an existing organization.");
  } else if (organizationName) {
    const matches = await prisma.organization.findMany({ where: { name: organizationName }, select: { id: true }, take: 2 });
    if (matches.length > 1) throw new Error("More than one workspace has that name. Set USER_ORGANIZATION_ID instead.");
    if (matches.length === 1) orgId = matches[0].id;
    else {
      const organization = await prisma.organization.create({ data: { name: organizationName }, select: { id: true } });
      orgId = organization.id;
    }
  } else {
    throw new Error("Set USER_ORGANIZATION_ID to join an existing workspace, or USER_ORGANIZATION_NAME to create a new isolated workspace.");
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), organizationId: orgId, role: requestedRole as UserRole },
    select: { id: true, email: true, role: true, organizationId: true },
  });
  console.log(JSON.stringify({ created: true, user }));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : "Unable to create user.");
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
