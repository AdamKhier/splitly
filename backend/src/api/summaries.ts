import { computeBalances } from "../engine/balances.ts";
import type { Expense, PublicUser, Trip, User } from "../store/types.ts";
import { toPublicUser } from "../store/types.ts";
import type { Store } from "../store/store.ts";

export interface MemberView {
  user: PublicUser;
  joinedAt: string;
}

export interface TripDetailView {
  trip: Trip;
  members: MemberView[];
  usersById: Record<string, PublicUser>;
  expenseCount: number;
  settlementCount: number;
}

export async function tripDetail(ctx: { store: Store }, trip: Trip): Promise<TripDetailView> {
  const members = await ctx.store.listMembers(trip.id);
  const users = await Promise.all(members.map((m) => ctx.store.getUserById(m.userId)));
  const byId: Record<string, PublicUser> = {};
  for (const u of users) {
    if (u) byId[u.id] = toPublicUser(u);
  }
  const expenses = await ctx.store.listExpenses(trip.id);
  const settlements = await ctx.store.listSettlements(trip.id);
  return {
    trip,
    members: members.map((m) => ({ user: byId[m.userId]!, joinedAt: m.joinedAt })),
    usersById: byId,
    expenseCount: expenses.length,
    settlementCount: settlements.length,
  };
}

export interface ExpenseView {
  id: string;
  tripId: string;
  description: string;
  category: string;
  amountMinor: number;
  currencyCode: string;
  paidByUserId: string;
  paidBy: PublicUser;
  splitType: Expense["splitType"];
  splitInput?: Expense["splitInput"];
  shares: Array<{ userId: string; user: PublicUser; amountMinor: number }>;
  occurredAt: string;
  createdAt: string;
}

export function expenseView(
  expense: Expense,
  usersById: Record<string, PublicUser>,
): ExpenseView {
  const shares = Object.entries(expense.shares)
    .map(([userId, amountMinor]) => ({
      userId,
      user: usersById[userId] ?? { id: userId, username: "unknown", displayName: "Unknown", avatarColor: "#888888" },
      amountMinor,
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor);
  return {
    id: expense.id,
    tripId: expense.tripId,
    description: expense.description,
    category: expense.category,
    amountMinor: expense.amountMinor,
    currencyCode: expense.currencyCode,
    paidByUserId: expense.paidByUserId,
    paidBy: usersById[expense.paidByUserId]!,
    splitType: expense.splitType,
    ...(expense.splitInput ? { splitInput: expense.splitInput } : {}),
    shares,
    occurredAt: expense.occurredAt,
    createdAt: expense.createdAt,
  };
}

export function expenseViews(
  expenses: Expense[],
  usersById: Record<string, PublicUser>,
): ExpenseView[] {
  return expenses
    .map((e) => expenseView(e, usersById))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

export interface BalancesView {
  simplified: boolean;
  individuals: Array<{
    userId: string;
    user: PublicUser;
    paidMinor: number;
    shareMinor: number;
    netMinor: number;
  }>;
  flows: Array<{
    from: string;
    to: string;
    amountMinor: number;
    expenseId?: string;
    fromUser: PublicUser;
    toUser: PublicUser;
  }>;
  totals: { paidMinor: number; shareMinor: number };
  me: {
    userId: string;
    netMinor: number;
    toReceiveMinor: number;
    toPayMinor: number;
  };
}

export async function balancesView(
  ctx: { store: Store },
  trip: Trip,
  usersById: Record<string, PublicUser>,
  currentUserId: string,
  simplifyOverride?: boolean,
): Promise<BalancesView> {
  const expenses = await ctx.store.listExpenses(trip.id);
  const settlements = await ctx.store.listSettlements(trip.id);

  const result = computeBalances(
    expenses.map((e) => ({ id: e.id, paidBy: e.paidByUserId, totalMinor: e.amountMinor, shares: e.shares })),
    settlements.map((s) => ({ from: s.fromUserId, to: s.toUserId, amountMinor: s.amountMinor })),
    { simplify: simplifyOverride ?? trip.simplifyDebts },
  );

  const fallbackUser = (id: string): PublicUser => ({
    id,
    username: "unknown",
    displayName: "Unknown",
    avatarColor: "#888888",
  });

  const individuals = result.individual.map((i) => ({
    userId: i.participantId,
    user: usersById[i.participantId] ?? fallbackUser(i.participantId),
    paidMinor: i.paidMinor,
    shareMinor: i.shareMinor,
    netMinor: i.netMinor,
  }));

  const flows = result.flows.map((f) => ({
    from: f.from,
    to: f.to,
    amountMinor: f.amountMinor,
    ...(f.expenseId ? { expenseId: f.expenseId } : {}),
    fromUser: usersById[f.from] ?? fallbackUser(f.from),
    toUser: usersById[f.to] ?? fallbackUser(f.to),
  }));

  const toReceive = flows.filter((f) => f.to === currentUserId).reduce((s, f) => s + f.amountMinor, 0);
  const toPay = flows.filter((f) => f.from === currentUserId).reduce((s, f) => s + f.amountMinor, 0);
  const net = individuals.find((i) => i.userId === currentUserId)?.netMinor ?? 0;

  return {
    simplified: result.simplified,
    individuals,
    flows,
    totals: {
      paidMinor: result.individual.reduce((s, i) => s + i.paidMinor, 0),
      shareMinor: result.individual.reduce((s, i) => s + i.shareMinor, 0),
    },
    me: { userId: currentUserId, netMinor: net, toReceiveMinor: toReceive, toPayMinor: toPay },
  };
}

export function userName(user: User): string {
  return user.displayName.length > 0 ? user.displayName : user.username;
}