import { Router } from "express";
import { tokenForUser } from "../auth.ts";
import { asyncHandler, type AppContext } from "../context.ts";
import { getOrCreateUser } from "../services.ts";
import { demoAuthSchema } from "../validation.ts";
import { toPublicUser } from "../../store/types.ts";

export function authRoutes(ctx: AppContext): Router {
  const router = Router();

  router.post(
    "/demo",
    asyncHandler(async (req, res) => {
      const body = demoAuthSchema.parse(req.body ?? {});
      const username = body.username?.trim() || "addz";
      const user = await getOrCreateUser(ctx, username, body.displayName);
      const token = tokenForUser(user.id, ctx.tokenSecret);
      res.json({ token, user: toPublicUser(user) });
    }),
  );

  return router;
}