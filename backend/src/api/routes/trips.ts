import { Router } from "express";
import { randomUUID } from "node:crypto";
import { asyncHandler, type AppContext } from "../context.ts";
import { requireAuth, requireCreatorTrip, requireMemberTrip, requiredParam } from "../guards.ts";
import { badRequest, notFound } from "../errors.ts";
import { addMemberSchema, createTripSchema, updateTripSchema } from "../validation.ts";
import { balancesView, tripDetail } from "../summaries.ts";
import { getOrCreateUser, notification, userLink } from "../services.ts";
import { formatMoney } from "../../engine/money.ts";

interface TimelineEvent {
  id: string;
  type: "expense" | "settlement" | "request" | "member";
  happenedAt: string;
  title: string;
  detail: string;
  amountMinor?: number;
  currencyCode?: string;
}

export function tripRoutes(ctx: AppContext): Router {
  const router = Router();
  router.use(requireAuth(ctx));

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const body = createTripSchema.parse(req.body ?? {});
      const trip = {
        id: randomUUID(),
        name: body.name,
        ...(body.description ? { description: body.description } : {}),
        currencyCode: (body.currencyCode ?? "AUD").toUpperCase(),
        simplifyDebts: true,
        createdByUserId: req.userId!,
        createdAt: new Date().toISOString(),
      };
      await ctx.store.createTrip(trip);
      await ctx.store.addMember({ tripId: trip.id, userId: req.userId!, joinedAt: trip.createdAt });
      const detail = await tripDetail(ctx, trip);
      res.status(201).json({ trip: detail });
    }),
  );

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const trips = await ctx.store.tripsForUser(req.userId!);
      const views = await Promise.all(
        trips.map(async (trip) => {
          const detail = await tripDetail(ctx, trip);
          const balances = await balancesView(ctx, trip, detail.usersById, req.userId!);
          return {
            trip: detail.trip,
            members: detail.members,
            memberCount: detail.members.length,
            expenseCount: detail.expenseCount,
            netMinor: balances.me.netMinor,
            toReceiveMinor: balances.me.toReceiveMinor,
            toPayMinor: balances.me.toPayMinor,
          };
        }),
      );
      views.sort((a, b) => b.trip.createdAt.localeCompare(a.trip.createdAt));
      res.json({ trips: views });
    }),
  );

  router.get(
    "/:tripId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      res.json({ trip: await tripDetail(ctx, trip) });
    }),
  );

  router.patch(
    "/:tripId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const body = updateTripSchema.parse(req.body ?? {});
      const patch: Record<string, unknown> = {};
      if (body.name !== undefined) patch.name = body.name;
      if (body.description !== undefined) patch.description = body.description;
      if (body.currencyCode !== undefined) patch.currencyCode = body.currencyCode.toUpperCase();
      if (body.simplifyDebts !== undefined) patch.simplifyDebts = body.simplifyDebts;
      const updated = await ctx.store.updateTrip(trip.id, patch);
      res.json({ trip: await tripDetail(ctx, updated!) });
    }),
  );

  router.delete(
    "/:tripId",
    asyncHandler(async (req, res) => {
      const trip = await requireCreatorTrip(ctx, req.userId, req.params.tripId);
      await ctx.store.deleteTrip(trip.id);
      res.json({ ok: true });
    }),
  );

  router.post(
    "/:tripId/members",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const body = addMemberSchema.parse(req.body ?? {});
      const user = await getOrCreateUser(ctx, body.username, body.displayName, body.email);
      await ctx.store.addMember({ tripId: trip.id, userId: user.id, joinedAt: new Date().toISOString() });
      const inviter = await ctx.store.getUserById(req.userId!);
      await ctx.store.createNotification(
        notification({
          userId: user.id,
          kind: "trip_invite",
          tripId: trip.id,
          title: `Invited to ${trip.name}`,
          body: `${userLink(inviter!)} added you to “${trip.name}”.`,
        }),
      );
      res.json({ trip: await tripDetail(ctx, trip) });
    }),
  );

  router.delete(
    "/:tripId/members/:userId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const target = requiredParam(req.params.userId, "userId");
      if (target === trip.createdByUserId) badRequest("The trip creator cannot be removed");
      if (target !== req.userId && trip.createdByUserId !== req.userId) {
        badRequest("Only the trip creator can remove other members");
      }
      const isMember = await ctx.store.isMember(trip.id, target);
      if (!isMember) notFound("Member not found");
      await ctx.store.removeMember(trip.id, target);
      res.json({ trip: await tripDetail(ctx, trip) });
    }),
  );

  router.get(
    "/:tripId/timeline",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const events: TimelineEvent[] = [];

      for (const e of await ctx.store.listExpenses(trip.id)) {
        events.push({
          id: e.id,
          type: "expense",
          happenedAt: e.createdAt,
          title: `${detail.usersById[e.paidByUserId]?.displayName ?? "Someone"} added “${e.description}”`,
          detail: `${e.shares && Object.keys(e.shares).length} people split`,
          amountMinor: e.amountMinor,
          currencyCode: e.currencyCode,
        });
      }

      for (const s of await ctx.store.listSettlements(trip.id)) {
        const from = detail.usersById[s.fromUserId]?.displayName ?? "Someone";
        const to = detail.usersById[s.toUserId]?.displayName ?? "Someone";
        events.push({
          id: s.id,
          type: "settlement",
          happenedAt: s.completedAt ?? s.createdAt,
          title: s.status === "complete" ? `${from} settled up with ${to}` : `${from} owes ${to} (recorded)`,
          detail: s.status === "complete" ? `via ${s.method}` : "pending confirmation",
          amountMinor: s.amountMinor,
          currencyCode: s.currencyCode,
        });
      }

      for (const r of await ctx.store.listRequests(trip.id)) {
        const from = detail.usersById[r.fromUserId]?.displayName ?? "Someone";
        const to = detail.usersById[r.toUserId]?.displayName ?? "Someone";
        events.push({
          id: r.id,
          type: "request",
          happenedAt: r.createdAt,
          title: `${from} requested ${formatMoney(r.amountMinor, r.currencyCode)} from ${to}`,
          detail: r.message ?? "Payment request",
          amountMinor: r.amountMinor,
          currencyCode: r.currencyCode,
        });
      }

      events.sort((a, b) => b.happenedAt.localeCompare(a.happenedAt));
      res.json({ events });
    }),
  );

  router.get(
    "/:tripId/balances",
    asyncHandler(async (req, res) => {
      const raw = Array.isArray(req.query.simplify) ? undefined : req.query.simplify;
      const override =
        raw === undefined || raw === "" ? undefined : raw === "true" || raw === "1";
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const balances = await balancesView(ctx, trip, detail.usersById, req.userId!, override);
      res.json({ balances });
    }),
  );

  return router;
}