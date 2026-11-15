import { randomBytes } from "node:crypto";
import { readFile, rename, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import { ApiError } from "../utils/api-error";

const PROVIDER_KEYS = ["NVIDIA_API_KEY", "AI_PROVIDER"] as const;

function replaceEnvValue(contents: string, key: typeof PROVIDER_KEYS[number], value: string): string {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^\\s*${key}\\s*=.*$`, "m");
  if (pattern.test(contents)) return contents.replace(pattern, line);
  return `${contents.replace(/\s*$/, "")}${contents.trim() ? "\n" : ""}${line}\n`;
}

export function updateNvidiaEnvContents(contents: string, apiKey: string): string {
  return replaceEnvValue(replaceEnvValue(contents, "NVIDIA_API_KEY", apiKey), "AI_PROVIDER", "nvidia");
}

export function validateNvidiaKey(value: unknown): string {
  if (typeof value !== "string") throw new ApiError(400, "Enter an NVIDIA API key.");
  const key = value.trim();
  if (!/^[A-Za-z0-9._-]{20,500}$/.test(key)) throw new ApiError(400, "The NVIDIA API key format is invalid.");
  return key;
}

export const providerKeyService = {
  status() {
    return { configured: Boolean(env.NVIDIA_API_KEY), provider: env.AI_PROVIDER, model: env.NVIDIA_MODEL, localSetupAvailable: env.NODE_ENV === "development" };
  },

  async saveNvidiaKey(value: unknown) {
    if (env.NODE_ENV !== "development") throw new ApiError(404, "Local provider setup is unavailable in this environment.");
    const key = validateNvidiaKey(value);
    const filePath = path.resolve(__dirname, "..", "..", ".env");
    const tempPath = `${filePath}.${randomBytes(8).toString("hex")}.tmp`;
    let contents = "";
    try {
      contents = await readFile(filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw new ApiError(500, "Could not read the backend environment file.");
    }
    contents = updateNvidiaEnvContents(contents, key);
    try {
      await writeFile(tempPath, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await rename(tempPath, filePath);
    } catch {
      await unlink(tempPath).catch(() => undefined);
      throw new ApiError(500, "Could not save the key to BE/.env. Check the backend folder permissions.");
    }
    return { configured: true, provider: "nvidia", restartRequired: true };
  },
};
