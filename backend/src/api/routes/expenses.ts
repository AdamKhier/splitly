import { Router } from "express";
import { asyncHandler, type AppContext } from "../context.ts";
import { requireAuth, requireMemberTrip, requiredParam } from "../guards.ts";
import { notFound } from "../errors.ts";
import { createExpenseSchema } from "../validation.ts";
import { expenseView, tripDetail } from "../summaries.ts";
import { computeShares, notification, toExpense, userLink } from "../services.ts";
import { formatMoney } from "../../engine/money.ts";

export function expenseRoutes(ctx: AppContext): Router {
  const router = Router();
  router.use(requireAuth(ctx));

  router.get(
    "/:tripId/expenses",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const expenses = await ctx.store.listExpenses(trip.id);
      res.json({ expenses: expenses.map((e) => expenseView(e, detail.usersById)) });
    }),
  );

  router.post(
    "/:tripId/expenses",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const body = createExpenseSchema.parse(req.body ?? {});

      const memberIds = new Set(detail.members.map((m) => m.user.id));
      const computed = computeShares(trip.currencyCode, body, memberIds);
      const expense = toExpense({
        tripId: trip.id,
        description: body.description,
        category: body.category,
        currencyCode: computed.currencyCode,
        amountMinor: computed.amountMinor,
        paidByUserId: body.paidByUserId,
        splitType: computed.splitType,
        ...(computed.splitInput ? { splitInput: computed.splitInput } : {}),
        shares: computed.shares,
        ...(body.occurredAt ? { occurredAt: body.occurredAt } : {}),
      });
      await ctx.store.createExpense(expense);

      const payer = await ctx.store.getUserById(body.paidByUserId);
      const amountLabel = formatMoney(expense.amountMinor, expense.currencyCode);
      for (const member of detail.members) {
        if (member.user.id === body.paidByUserId) continue;
        await ctx.store.createNotification(
          notification({
            userId: member.user.id,
            kind: "expense_added",
            tripId: trip.id,
            title: `New expense in “${trip.name}”`,
            body: `${userLink(payer!)} added “${expense.description}” (${amountLabel}).`,
          }),
        );
      }

      res.status(201).json({ expense: expenseView(expense, detail.usersById) });
    }),
  );

  router.get(
    "/:tripId/expenses/:expenseId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const expense = await ctx.store.getExpense(requiredParam(req.params.expenseId, "expenseId"));
      if (!expense || expense.tripId !== trip.id) notFound("Expense not found");
      res.json({ expense: expenseView(expense, detail.usersById) });
    }),
  );

  router.patch(
    "/:tripId/expenses/:expenseId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const detail = await tripDetail(ctx, trip);
      const existing = await ctx.store.getExpense(requiredParam(req.params.expenseId, "expenseId"));
      if (!existing || existing.tripId !== trip.id) notFound("Expense not found");

      const body = createExpenseSchema.parse(req.body ?? {});
      const memberIds = new Set(detail.members.map((m) => m.user.id));
      const computed = computeShares(trip.currencyCode, body, memberIds);
      const expense = toExpense({
        id: existing.id,
        tripId: trip.id,
        description: body.description,
        category: body.category,
        currencyCode: computed.currencyCode,
        amountMinor: computed.amountMinor,
        paidByUserId: body.paidByUserId,
        splitType: computed.splitType,
        ...(computed.splitInput ? { splitInput: computed.splitInput } : {}),
        shares: computed.shares,
        ...(body.occurredAt ? { occurredAt: body.occurredAt } : {}),
        createdAt: existing.createdAt,
      });
      const updated = await ctx.store.updateExpense(existing.id, expense);

      res.json({ expense: expenseView(updated!, detail.usersById) });
    }),
  );

  router.delete(
    "/:tripId/expenses/:expenseId",
    asyncHandler(async (req, res) => {
      const trip = await requireMemberTrip(ctx, req.userId, req.params.tripId);
      const expense = await ctx.store.getExpense(requiredParam(req.params.expenseId, "expenseId"));
      if (!expense || expense.tripId !== trip.id) notFound("Expense not found");
      await ctx.store.deleteExpense(expense.id);
      res.json({ ok: true });
    }),
  );

  return router;
}