import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error";
import { ZodError } from "zod";

type PrismaInitializationError = Error & { errorCode?: string };

function isPrismaInitializationError(error: unknown): error is PrismaInitializationError {
  return error instanceof Error && error.name === "PrismaClientInitializationError";
}

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: err.errors.map((e) => ({ path: e.path.join("."), message: e.message })),
    });
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (isPrismaInitializationError(err)) {
    console.error(JSON.stringify({
      event: "database_unavailable",
      errorCode: err.errorCode,
    }));

    const message = process.env.NODE_ENV === "production"
      ? "Service temporarily unavailable"
      : "Database connection unavailable. Check DATABASE_URL in BE/.env, confirm the MySQL credentials and database, then restart the backend.";

    return res.status(503).json({
      success: false,
      message,
    });
  }

  console.error(JSON.stringify({ event: "request_failed", errorType: err instanceof Error ? err.name : "UnknownError" }));
  const message = "Internal server error";

  return res.status(500).json({
    success: false,
    message,
  });
}
