import { Router } from "express";
import { asyncHandler, type AppContext } from "../context.ts";
import { requireAuth, loadCurrentUser, requiredParam } from "../guards.ts";
import { userSearchSchema } from "../validation.ts";
import { toPublicUser } from "../../store/types.ts";

export function userRoutes(ctx: AppContext): Router {
  const router = Router();
  router.use(requireAuth(ctx));

  router.get(
    "/me",
    asyncHandler(async (req, res) => {
      const user = await loadCurrentUser(ctx, req.userId!);
      res.json({ user: toPublicUser(user) });
    }),
  );

  router.get(
    "/search",
    asyncHandler(async (req, res) => {
      const { q } = userSearchSchema.parse(req.query);
      const users = await ctx.store.listUsers(q, req.userId);
      res.json({ users: users.map(toPublicUser) });
    }),
  );

  router.get(
    "/notifications",
    asyncHandler(async (req, res) => {
      const notifications = await ctx.store.listNotifications(req.userId!);
      const trips = await ctx.store.tripsForUser(req.userId!);
      const tripName = (id?: string) => trips.find((t) => t.id === id)?.name;
      res.json({
        notifications: notifications.map((n) => ({
          ...n,
          ...(n.tripId ? { tripName: tripName(n.tripId) } : {}),
        })),
      });
    }),
  );

  router.patch(
    "/notifications/:id/read",
    asyncHandler(async (req, res) => {
      const updated = await ctx.store.markNotificationRead(
        requiredParam(req.params.id, "id"),
        req.userId!,
      );
      if (!updated) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }
      res.json({ notification: updated });
    }),
  );

  router.post(
    "/notifications/read-all",
    asyncHandler(async (req, res) => {
      await ctx.store.markAllNotificationsRead(req.userId!);
      const notifications = await ctx.store.listNotifications(req.userId!);
      res.json({ notifications });
    }),
  );

  return router;
}