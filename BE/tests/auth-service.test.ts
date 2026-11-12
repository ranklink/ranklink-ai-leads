import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, hashSessionToken, verifyPassword } from "../src/services/auth.service";

test("passwords are stored as scrypt hashes and verify without exposing the password", async () => {
  const password = "a-long-test-password-123";
  const hash = await hashPassword(password);
  assert.match(hash, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("session tokens are represented by deterministic SHA-256 hashes", () => {
  const token = "test-session-token";
  assert.equal(hashSessionToken(token), hashSessionToken(token));
  assert.notEqual(hashSessionToken(token), token);
});
