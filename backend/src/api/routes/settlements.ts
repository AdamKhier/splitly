import { Router } from "express";
import { randomUUID } from "node:crypto";
import { asyncHandler, type AppContext } from "../context.ts";
import { requireAuth, requireMemberTrip, requiredParam } from "../guards.ts";
import { badRequest, notFound } from "../errors.ts";
import { createRequestSchema, createSettlementSchema, updateSettlementSchema } from "../validation.ts";
import { tripDetail } from "../summaries.ts";
import { notification, settleMethodLabel, userLink } from "../services.ts";
import { formatMoney } from "../../engine/money.ts";
import { toMinor } from "../../engine/currency.ts";
import type { Settlement } from "../../store/types.ts";

interface SettlementView extends Settlement {
  fromUser: { displayName: string; username: string; avatarColor: string; id: string };
  toUser: { displayName: string; username: string; avatarColor: string; id: string };
}

interface RequestView {
  id: string;
  tripId: string;
  fromUser: { displayName: string; username: string; avatarColor: string; id: string };
  toUser: { displayName: string; username: string; avatarColor: string; id: string };
  amountMinor: number;
  currencyCode: string;
  message?: string;
  createdAt: string;
}

export function settlementRoutes(ctx: AppContext): Router {
  const router = Router();
  router.use(requireAuth(ctx));

  router.get(
    "/:tripId/settlements",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const settlements = await ctx.store.listSettlements(trip.id);
      res.json({ settlements: settlements.map((s) => view(s, detail)) });
    }),
  );

  router.post(
    "/:tripId/settlements",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const body = createSettlementSchema.parse(req.body ?? {});

      for (const uid of [body.fromUserId, body.toUserId]) {
        if (!detail.members.some((m) => m.user.id === uid)) badRequest("Both people must be trip members");
      }
      if (body.fromUserId === body.toUserId) badRequest("Settlement needs two different people");
      const amountMinor = toMinor(body.amount, trip.currencyCode);

      const settlement: Settlement = {
        id: randomUUID(),
        tripId: trip.id,
        fromUserId: body.fromUserId,
        toUserId: body.toUserId,
        amountMinor,
        currencyCode: trip.currencyCode,
        method: body.method,
        ...(body.note ? { note: body.note } : {}),
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      await ctx.store.createSettlement(settlement);

      const to = await ctx.store.getUserById(body.toUserId);
      await ctx.store.createNotification(
        notification({
          userId: body.fromUserId,
          kind: "payment_settled",
          tripId: trip.id,
          title: `Payment recorded in “${trip.name}”`,
          body: `You owe ${userLink(to!)} ${formatMoney(amountMinor, trip.currencyCode)} — mark it paid when done.`,
        }),
      );

      res.status(201).json({ settlement: view(settlement, detail) });
    }),
  );

  router.patch(
    "/:tripId/settlements/:settlementId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const existing = await ctx.store.getSettlement(requiredParam(req.params.settlementId, "settlementId"));
      if (!existing || existing.tripId !== trip.id) notFound("Settlement not found");

      const body = updateSettlementSchema.parse(req.body ?? {});
      const patch: Record<string, unknown> = {};
      if (body.method !== undefined) patch.method = body.method;
      if (body.note !== undefined) patch.note = body.note;
      if (body.status !== undefined) patch.status = body.status;

      const wasComplete = existing.status === "complete";
      const willBeComplete = body.status === "complete";

      if (willBeComplete && !wasComplete) {
        patch.completedAt = new Date().toISOString();
        const from = await ctx.store.getUserById(existing.fromUserId);
        const to = await ctx.store.getUserById(existing.toUserId);
        const amountLabel = formatMoney(existing.amountMinor, existing.currencyCode);
        await ctx.store.createNotification(
          notification({
            userId: existing.toUserId,
            kind: "payment_settled",
            tripId: trip.id,
            title: "Payment settled",
            body: `${userLink(from!)} settled ${amountLabel} with you in “${trip.name}” (via ${settleMethodLabel(existing.method)}).`,
          }),
        );
        await ctx.store.createNotification(
          notification({
            userId: existing.fromUserId,
            kind: "payment_settled",
            tripId: trip.id,
            title: "Payment settled",
            body: `You settled ${amountLabel} with ${userLink(to!)} in “${trip.name}”.`,
          }),
        );
      }
      if (!willBeComplete && wasComplete) {
        patch.completedAt = undefined;
      }

      const updated = await ctx.store.updateSettlement(existing.id, patch);
      res.json({ settlement: view(updated!, detail) });
    }),
  );

  router.delete(
    "/:tripId/settlements/:settlementId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const existing = await ctx.store.getSettlement(requiredParam(req.params.settlementId, "settlementId"));
      if (!existing || existing.tripId !== trip.id) notFound("Settlement not found");
      await ctx.store.deleteSettlement(existing.id);
      res.json({ ok: true });
    }),
  );

  router.get(
    "/:tripId/requests",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const requests = await ctx.store.listRequests(trip.id);
      res.json({ requests: requests.map((r) => requestView(r, detail)) });
    }),
  );

  router.post(
    "/:tripId/requests",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const body = createRequestSchema.parse(req.body ?? {});

      if (!detail.members.some((m) => m.user.id === body.toUserId)) badRequest("Recipient must be a trip member");
      const amountMinor = toMinor(body.amount, trip.currencyCode);

      const request = await ctx.store.createRequest({
        id: randomUUID(),
        tripId: trip.id,
        fromUserId: req.userId!,
        toUserId: body.toUserId,
        amountMinor,
        currencyCode: trip.currencyCode,
        ...(body.message ? { message: body.message } : {}),
        createdAt: new Date().toISOString(),
      });

      const requester = await ctx.store.getUserById(req.userId!);
      await ctx.store.createNotification(
        notification({
          userId: body.toUserId,
          kind: "payment_requested",
          tripId: trip.id,
          title: `Payment requested in “${trip.name}”`,
          body: `${userLink(requester!)} requested ${formatMoney(amountMinor, trip.currencyCode)} from you${body.message ? ` — “${body.message}”` : ""}.`,
        }),
      );

      res.status(201).json({ request: requestView(request, detail) });
    }),
  );

  router.delete(
    "/:tripId/requests/:requestId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const request = (await ctx.store.listRequests(trip.id)).find((r) => r.id === requiredParam(req.params.requestId, "requestId"));
      if (!request) notFound("Request not found");
      await ctx.store.deleteRequest(request.id);
      res.json({ ok: true });
    }),
  );

  function view(s: Settlement, detail: Awaited<ReturnType<typeof tripDetail>>): SettlementView {
    const fromUser = detail.usersById[s.fromUserId]!;
    const toUser = detail.usersById[s.toUserId]!;
    return { ...s, fromUser, toUser };
  }

  function requestView(r: { id: string; tripId: string; fromUserId: string; toUserId: string; amountMinor: number; currencyCode: string; message?: string; createdAt: string }, detail: Awaited<ReturnType<typeof tripDetail>>): RequestView {
    return {
      id: r.id,
      tripId: r.tripId,
      fromUser: detail.usersById[r.fromUserId]!,
      toUser: detail.usersById[r.toUserId]!,
      amountMinor: r.amountMinor,
      currencyCode: r.currencyCode,
      ...(r.message ? { message: r.message } : {}),
      createdAt: r.createdAt,
    };
  }

  return router;
}