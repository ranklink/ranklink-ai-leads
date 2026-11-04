import express from "express";
import cors from "cors";
import routes from "./routes";
import { errorMiddleware } from "./middleware/error.middleware";
import { notFoundMiddleware } from "./middleware/not-found.middleware";
import { env } from "./config/env";
import { establishWorkspaceContext, sameOrigin } from "./middleware/workspace.middleware";
import { generalRateLimiter } from "./middleware/rate-limit.middleware";
import telegramWebhookRoutes from "./routes/telegram-webhook.routes";

const app = express();

app.disable("x-powered-by");
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [env.FRONTEND_URL, "http://localhost:3000", "http://localhost:3001"];
      if (!origin || allowed.includes(origin) || (!env.isProduction && origin.startsWith("http://localhost:"))) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },

  })
);

app.use(express.json({ limit: "64kb" }));
app.get("/api/v1/health", (_req, res) => res.json({ success: true, message: "API is running" }));
app.use("/api/v1/telegram/webhook", generalRateLimiter, telegramWebhookRoutes);
app.use("/api/v1", generalRateLimiter, sameOrigin);
app.use("/api/v1", establishWorkspaceContext);

app.use("/api/v1", routes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
