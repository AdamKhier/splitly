import { randomUUID } from "node:crypto";
import { toMinor } from "../engine/currency.ts";
import { splitEqual, splitExact, splitPercentage, type SplitType } from "../engine/split.ts";
import type { AppContext } from "./context.ts";
import { badRequest } from "./errors.ts";
import type { CreateExpenseInput } from "./validation.ts";
import type { AppNotification, Expense, SettlementMethod, User } from "../store/types.ts";
import { toPublicUser } from "../store/types.ts";

const AVATAR_COLORS = [
  "#6C5CE7",
  "#00B894",
  "#FDCB6E",
  "#E17055",
  "#0984E3",
  "#E84393",
  "#00CEC9",
  "#F0932B",
  "#B97B4E",
  "#636E72",
];

export function newAvatarColor(used: string[]): string {
  const free = AVATAR_COLORS.filter((c) => !used.includes(c));
  return free[Math.floor(Math.random() * free.length)] ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]!;
}

/** Find a user by username, or create a shell account for them (manual entry path). */
export async function getOrCreateUser(ctx: AppContext, username: string, displayName?: string, email?: string): Promise<User> {
  const existing = await ctx.store.getUserByUsername(username);
  if (existing) return existing;
  const user: User = {
    id: randomUUID(),
    username: username.trim(),
    displayName: displayName?.trim() || username.trim(),
    ...(email ? { email } : {}),
    avatarColor: newAvatarColor([]),
    createdAt: new Date().toISOString(),
  };
  await ctx.store.createUser(user);
  return user;
}

export interface ShareComputation {
  shares: Record<string, number>;
  splitInput?: Expense["splitInput"];
  splitType: SplitType;
}

export function computeShares(
  tripCurrencyCode: string,
  input: CreateExpenseInput,
  allowedUserIds: Set<string>,
): { currencyCode: string; amountMinor: number; shares: Record<string, number>; splitType: SplitType; splitInput?: Expense["splitInput"] } {
  const currencyCode = (input.currencyCode ?? tripCurrencyCode).toUpperCase();
  const amountMinor = toMinor(input.amount, currencyCode);

  const among = [...new Set(input.split.among)];
  for (const uid of among) {
    if (!allowedUserIds.has(uid)) badRequest(`User ${uid} is not a member of this trip`);
  }
  if (input.splitType !== "equal" && input.splitType !== "exact" && input.splitType !== "percentage") {
    badRequest("Invalid split type");
  }
  if (!allowedUserIds.has(input.paidByUserId)) {
    badRequest("The payer is not a member of this trip");
  }
  if (among.length < 1) badRequest("Split must include at least one person");

  let shareValues: number[];
  let splitInput: Expense["splitInput"] | undefined;

  switch (input.splitType) {
    case "equal":
      shareValues = splitEqual(amountMinor, among.length);
      break;
    case "exact": {
      const exact = input.split.exact;
      if (!exact) badRequest("Exact split requires per-person amounts");
      const values = among.map((uid) => exact[uid] ?? 0);
      shareValues = splitExact(amountMinor, values);
      splitInput = { kind: "exact", exactShares: Object.fromEntries(among.map((uid) => [uid, exact[uid] ?? 0])) };
      break;
    }
    case "percentage": {
      const percentages = input.split.percentages;
      if (!percentages) badRequest("Percentage split requires per-person percentages");
      for (const uid of among) {
        if (percentages[uid] === undefined) badRequest(`Missing percentage for user ${uid}`);
      }
      const values = among.map((uid) => percentages[uid] ?? 0);
      const sum = values.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.01) badRequest(`Percentages must sum to 100% (got ${sum.toFixed(2)}%)`);
      shareValues = splitPercentage(amountMinor, values);
      splitInput = { kind: "percentage", percentages: Object.fromEntries(among.map((uid) => [uid, percentages[uid] ?? 0])) };
      break;
    }
  }

  const shares: Record<string, number> = {};
  among.forEach((uid, i) => {
    shares[uid] = shareValues[i]!;
  });

  return { currencyCode, amountMinor, shares, splitType: input.splitType, ...(splitInput ? { splitInput } : {}) };
}

export function toExpense(params: {
  id?: string;
  tripId: string;
  description: string;
  category: string;
  currencyCode: string;
  amountMinor: number;
  paidByUserId: string;
  splitType: SplitType;
  splitInput?: Expense["splitInput"];
  shares: Record<string, number>;
  occurredAt?: string;
  createdAt?: string;
}): Expense {
  const now = new Date().toISOString();
  return {
    id: params.id ?? randomUUID(),
    tripId: params.tripId,
    description: params.description,
    category: params.category,
    amountMinor: params.amountMinor,
    currencyCode: params.currencyCode,
    paidByUserId: params.paidByUserId,
    splitType: params.splitType,
    ...(params.splitInput ? { splitInput: params.splitInput } : {}),
    shares: params.shares,
    occurredAt: params.occurredAt ?? now,
    createdAt: params.createdAt ?? now,
  };
}

export function notification(params: {
  userId: string;
  kind: AppNotification["kind"];
  tripId?: string;
  title: string;
  body: string;
}): AppNotification {
  return {
    id: randomUUID(),
    userId: params.userId,
    kind: params.kind,
    ...(params.tripId ? { tripId: params.tripId } : {}),
    title: params.title,
    body: params.body,
    read: false,
    createdAt: new Date().toISOString(),
  };
}

export function settleMethodLabel(method: SettlementMethod): string {
  const labels: Record<SettlementMethod, string> = {
    cash: "Cash",
    bank: "Bank transfer",
    payid: "PayID / Osko",
    card: "Card",
    other: "Other",
  };
  return labels[method];
}

export function userLink(user: User): string {
  return toPublicUser(user).displayName;
}