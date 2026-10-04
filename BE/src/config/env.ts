import dotenv from "dotenv";
dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const env = {
  PORT: parseInt(process.env.PORT || "5000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
  DATABASE_URL: process.env.DATABASE_URL || "",
  GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || "",
  HUNTER_API_KEY: process.env.HUNTER_API_KEY || "",
  HUNTER_API_BASE_URL: process.env.HUNTER_API_BASE_URL || "https://api.hunter.io/v2",
  HUNTER_EMAIL_ACCOUNT_ID: process.env.HUNTER_EMAIL_ACCOUNT_ID || "",
  AI_PROVIDER: process.env.AI_PROVIDER || "template",
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY || "",
  NVIDIA_BASE_URL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  NVIDIA_MODEL: process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-lightning-30b-a3b",
  OUTREACH_SENDER_NAME: process.env.OUTREACH_SENDER_NAME || "",
  OUTREACH_SENDER_EMAIL: process.env.OUTREACH_SENDER_EMAIL || "",
  OUTREACH_REPLY_TO: process.env.OUTREACH_REPLY_TO || "",
  OUTREACH_ENABLED: process.env.OUTREACH_ENABLED === "true",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME || "",
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL || "",
  isProduction: process.env.NODE_ENV === "production",
};
