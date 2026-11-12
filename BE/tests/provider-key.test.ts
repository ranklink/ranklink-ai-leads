import assert from "node:assert/strict";
import test from "node:test";
import { updateNvidiaEnvContents, validateNvidiaKey } from "../src/services/provider-key.service";

test("NVIDIA key validation rejects short, whitespace, and non-string values", () => {
  assert.throws(() => validateNvidiaKey("short"), /format is invalid/);
  assert.throws(() => validateNvidiaKey("nvapi-invalid key with spaces"), /format is invalid/);
  assert.throws(() => validateNvidiaKey(undefined), /Enter an NVIDIA API key/);
});

test("NVIDIA key validation accepts a bounded key without changing it", () => {
  const key = `nvapi-${"a".repeat(32)}`;
  assert.equal(validateNvidiaKey(key), key);
});

test("NVIDIA environment update replaces existing settings and preserves unrelated values", () => {
  const updated = updateNvidiaEnvContents("PORT=5000\nAI_PROVIDER=template\nNVIDIA_API_KEY=old-key\n", `nvapi-${"b".repeat(32)}`);
  assert.match(updated, /^PORT=5000/m);
  assert.match(updated, /^AI_PROVIDER=nvidia$/m);
  assert.match(updated, /^NVIDIA_API_KEY=nvapi-b+$/m);
  assert.equal(updated.match(/^NVIDIA_API_KEY=/gm)?.length, 1);
  assert.equal(updated.match(/^AI_PROVIDER=/gm)?.length, 1);
});
