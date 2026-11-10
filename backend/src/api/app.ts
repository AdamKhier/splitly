import express, { type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "./errors.ts";
import type { AppContext } from "./context.ts";
import { authRoutes } from "./routes/auth.ts";
import { userRoutes } from "./routes/users.ts";
import { tripRoutes } from "./routes/trips.ts";
import { expenseRoutes } from "./routes/expenses.ts";
import { settlementRoutes } from "./routes/settlements.ts";

export function createApp(ctx: AppContext): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  app.use((req, _res, next) => {
    const start = Date.now();
    next();
    const elapsed = Date.now() - start;
    if (process.env.SPLITLY_LOG !== "0") {
      console.log(`${req.method} ${req.originalUrl} ${elapsed}ms`);
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "splitly-api", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes(ctx));
  app.use("/api/users", userRoutes(ctx));
  app.use("/api/trips", tripRoutes(ctx));
  app.use("/api/trips", expenseRoutes(ctx));
  app.use("/api/trips", settlementRoutes(ctx));

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) {
      res.status(400).json({
        error: "Validation failed",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return;
    }
    if (err instanceof ApiError) {
      res.status(err.status).json({ error: err.message, ...(err.details ? { details: err.details } : {}) });
      return;
    }
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}