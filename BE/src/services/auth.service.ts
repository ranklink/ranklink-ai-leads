import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { User, UserRole } from "@prisma/client";
import prisma from "../config/database";

const KEY_LENGTH = 64;
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function deriveKey(password: string, salt: string, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, keyLength, { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await deriveKey(password, salt, KEY_LENGTH);
  return `scrypt$16384$8$1$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, n, r, p, salt, expectedHex] = encoded.split("$");
  if (algorithm !== "scrypt" || n !== "16384" || r !== "8" || p !== "1" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;
  const actual = await deriveKey(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  const passwordHash = user?.passwordHash ?? "scrypt$16384$8$1$00000000000000000000000000000000$" + "00".repeat(KEY_LENGTH);
  const passwordMatches = await verifyPassword(password, passwordHash);
  if (!user || user.disabled || !passwordMatches) return null;
  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await prisma.session.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt } });
  return { token, expiresAt };
}

export async function resolveSession(token: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date() || session.user.disabled) {
    await prisma.session.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session;
}

export async function revokeSession(token: string) {
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

export type AuthenticatedUser = Pick<User, "id" | "organizationId" | "email" | "role">;

export function publicUser(user: AuthenticatedUser) {
  return { id: user.id, organizationId: user.organizationId, email: user.email, role: user.role as UserRole };
}
