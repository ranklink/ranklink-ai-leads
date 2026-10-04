import app from "./app";
import { env } from "./config/env";
import { configureTelegramWebhook } from "./services/telegram.service";

const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}/api/v1`);
  console.log(`   Health: http://localhost:${PORT}/api/v1/health`);
  if (!env.GOOGLE_PLACES_API_KEY || env.GOOGLE_PLACES_API_KEY === "your_google_key") {
    console.warn("⚠️  GOOGLE_PLACES_API_KEY not set. Add real key to BE/.env to enable live Google Places API");
  }
  void configureTelegramWebhook().catch((error) => {
    console.error(JSON.stringify({ event: "telegram_webhook_setup_failed", errorCode: error instanceof Error ? error.message : "UNKNOWN" }));
  });
});
