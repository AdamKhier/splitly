import { randomUUID } from "node:crypto";
import { split, type SplitType } from "../engine/split.ts";
import { toMinor } from "../engine/currency.ts";
import type { Expense, Settlement, Trip, User } from "./types.ts";
import type { Store } from "./store.ts";

/**
 * Populates a blank database with believable demo data so the app is
 * interesting on first launch, all computed through the real split engine.
 * Only seeds when the store is empty.
 */
export async function seedIfEmpty(store: Store): Promise<boolean> {
  const db = store.snapshot();
  if (db.users.length > 0 || db.trips.length > 0) return false;

  const now = new Date();
  const iso = (daysAgo: number, hour = 12) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 10, 0, 0);
    return d.toISOString();
  };

  const users: User[] = [
    mkUser("u_addz", "addz", "Andrew", "#6C5CE7", iso(40)),
    mkUser("u_maya", "maya", "Maya", "#00B894", iso(40)),
    mkUser("u_leo", "leo", "Leo", "#FDCB6E", iso(40)),
    mkUser("u_sam", "sam", "Sam", "#E17055", iso(40)),
    mkUser("u_alex", "alex", "Alex", "#0984E3", iso(18)),
    mkUser("u_nina", "nina", "Nina", "#E84393", iso(18)),
    mkUser("u_priya", "priya", "Priya", "#00CEC9", iso(5)),
  ];
  for (const u of users) await store.createUser(u);

  // --- Trip 1: Bali Trip 2026 (AUD, equal + exact + percentage splits) ---
  const bali: Trip = {
    id: "t_bali",
    name: "Bali Trip 2026",
    description: "Seminyak villa with the crew",
    currencyCode: "AUD",
    simplifyDebts: true,
    createdByUserId: "u_addz",
    createdAt: iso(35),
  };
  await store.createTrip(bali);
  const baliMembers = ["u_addz", "u_maya", "u_leo", "u_sam"];
  for (const uid of baliMembers) await store.addMember({ tripId: bali.id, userId: uid, joinedAt: iso(35) });

  type BaliSpec = [string, string, string, number, SplitType, string[], { exact?: Record<string, number>; pct?: Record<string, number> }?];
  const baliExpenses: BaliSpec[] = [
    ["Villa deposit", "u_addz", "accommodation", 850, "equal", baliMembers],
    ["Villa final payment", "u_addz", "accommodation", 2500, "equal", baliMembers],
    ["Villa cleaning", "u_leo", "accommodation", 120, "equal", baliMembers],
    ["Groceries — first week", "u_maya", "food", 240, "equal", baliMembers],
    ["Scooter rentals", "u_sam", "transport", 320, "equal", baliMembers],
    ["Beach club lunch", "u_addz", "food", 180, "equal", baliMembers],
    ["Airport transfer", "u_leo", "transport", 95, "equal", baliMembers],
    ["Pottery workshop", "u_maya", "activities", 140, "exact", ["u_addz", "u_leo", "u_maya"], { exact: { u_addz: 6000, u_leo: 4000, u_maya: 4000 } }],
    ["Spa day", "u_sam", "activities", 400, "percentage", ["u_addz", "u_maya"], { pct: { u_addz: 50, u_maya: 50 } }],
  ];

  for (let i = 0; i < baliExpenses.length; i++) {
    const [desc, payer, category, major, splitType, among, extra] = baliExpenses[i]!;
    await store.createExpense(
      makeExpense({
        tripId: bali.id,
        description: desc,
        paidByUserId: payer,
        category,
        major,
        splitType,
        among,
        ...(extra?.exact ? { exactShares: extra.exact } : {}),
        ...(extra?.pct ? { percentages: extra.pct } : {}),
        daysAgo: 35 - i * 3,
      }),
    );
  }

  await store.createSettlement(mkSettlement({ tripId: bali.id, from: "u_sam", to: "u_leo", major: 50, method: "cash", daysAgo: 6, complete: true }));
  await store.createSettlement(mkSettlement({ tripId: bali.id, from: "u_maya", to: "u_addz", major: 100, method: "bank", daysAgo: 3, complete: true }));

  await store.createRequest({
    id: randomUUID(),
    tripId: bali.id,
    fromUserId: "u_addz",
    toUserId: "u_sam",
    amountMinor: toMinor(75, "AUD"),
    currencyCode: "AUD",
    message: "Burner top-up, thanks!",
    createdAt: iso(1),
  });
  await store.createNotification({
    id: randomUUID(),
    userId: "u_addz",
    kind: "payment_requested",
    tripId: bali.id,
    title: "Request sent",
    body: "You asked Sam for $75.00 (Burner top-up).",
    read: true,
    createdAt: iso(1),
  });

  // --- Trip 2: Rent & Bills (percentage utilities + equal split) ---
  const rent: Trip = {
    id: "t_rent",
    name: "Rent & Bills",
    description: "Flat at 14 Harbour Street",
    currencyCode: "AUD",
    simplifyDebts: true,
    createdByUserId: "u_addz",
    createdAt: iso(20),
  };
  await store.createTrip(rent);
  for (const uid of ["u_addz", "u_alex", "u_nina"]) await store.addMember({ tripId: rent.id, userId: uid, joinedAt: iso(20) });

  await store.createExpense(makeExpense({ tripId: rent.id, description: "February rent", paidByUserId: "u_addz", category: "housing", major: 2200, splitType: "equal", among: ["u_addz", "u_alex", "u_nina"], daysAgo: 16 }));
  await store.createExpense(makeExpense({ tripId: rent.id, description: "Electricity", paidByUserId: "u_nina", category: "utilities", major: 213.4, splitType: "percentage", among: ["u_addz", "u_alex", "u_nina"], percentages: { u_addz: 40, u_alex: 40, u_nina: 20 }, daysAgo: 9 }));
  await store.createExpense(makeExpense({ tripId: rent.id, description: "Internet", paidByUserId: "u_alex", category: "utilities", major: 89.99, splitType: "equal", among: ["u_addz", "u_alex", "u_nina"], daysAgo: 7 }));
  await store.createExpense(makeExpense({ tripId: rent.id, description: "Water", paidByUserId: "u_addz", category: "utilities", major: 62.4, splitType: "equal", among: ["u_addz", "u_alex", "u_nina"], daysAgo: 4 }));

  // --- Trip 3: Team Lunch (small, exact split) ---
  const lunch: Trip = {
    id: "t_lunch",
    name: "Team Lunch — Sydney",
    description: "Payback lunch",
    currencyCode: "AUD",
    simplifyDebts: true,
    createdByUserId: "u_addz",
    createdAt: iso(4),
  };
  await store.createTrip(lunch);
  for (const uid of ["u_addz", "u_priya"]) await store.addMember({ tripId: lunch.id, userId: uid, joinedAt: iso(4) });
  await store.createExpense(makeExpense({ tripId: lunch.id, description: "Ramen at Ichi", paidByUserId: "u_addz", category: "food", major: 32, splitType: "equal", among: ["u_addz", "u_priya"], daysAgo: 3 }));

  await store.createNotification({
    id: randomUUID(),
    userId: "u_addz",
    kind: "expense_added",
    tripId: bali.id,
    title: "Expense added",
    body: "Sam added “Spa day” ($400.00) in Bali Trip 2026.",
    read: false,
    createdAt: iso(8),
  });
  await store.createNotification({
    id: randomUUID(),
    userId: "u_addz",
    kind: "payment_settled",
    tripId: bali.id,
    title: "Payment settled",
    body: "Maya settled $100.00 with you in Bali Trip 2026.",
    read: false,
    createdAt: iso(3),
  });

  return true;
}

function mkUser(id: string, username: string, displayName: string, avatarColor: string, createdAt: string): User {
  return { id, username, displayName, avatarColor, createdAt };
}

interface ExpenseSpec {
  tripId: string;
  description: string;
  paidByUserId: string;
  category: string;
  major: number;
  splitType: SplitType;
  among: string[];
  percentages?: Record<string, number>;
  exactShares?: Record<string, number>;
  daysAgo: number;
}

function makeExpense(spec: ExpenseSpec): Expense {
  const { among, splitType, exactShares, percentages } = spec;
  const totalMinor = toMinor(spec.major, "AUD");
  const shares: Record<string, number> = {};
  let shareValues: number[];

  if (splitType === "equal") {
    shareValues = split("equal", totalMinor, { count: among.length });
  } else if (splitType === "exact") {
    const values = among.map((uid) => exactShares?.[uid] ?? 0);
    shareValues = split("exact", totalMinor, { exactShares: values });
  } else {
    const values = among.map((uid) => percentages?.[uid] ?? 0);
    shareValues = split("percentage", totalMinor, { percentages: values });
  }
  among.forEach((uid, i) => {
    shares[uid] = shareValues[i]!;
  });

  const occurredAt = new Date();
  occurredAt.setDate(occurredAt.getDate() - spec.daysAgo);
  const createdAt = new Date(occurredAt);
  createdAt.setDate(createdAt.getDate() + 1);

  return {
    id: randomUUID(),
    tripId: spec.tripId,
    description: spec.description,
    category: spec.category,
    amountMinor: totalMinor,
    currencyCode: "AUD",
    paidByUserId: spec.paidByUserId,
    splitType,
    ...(splitType === "exact"
      ? { splitInput: { kind: "exact" as const, exactShares: exactShares ?? {} } }
      : splitType === "percentage"
        ? { splitInput: { kind: "percentage" as const, percentages: percentages ?? {} } }
        : {}),
    shares,
    occurredAt: occurredAt.toISOString(),
    createdAt: createdAt.toISOString(),
  };
}

interface SettlementSpec {
  tripId: string;
  from: string;
  to: string;
  major: number;
  method: Settlement["method"];
  daysAgo: number;
  complete: boolean;
}

function mkSettlement(spec: SettlementSpec): Settlement {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - spec.daysAgo);
  const completedAt = new Date(createdAt);
  completedAt.setDate(completedAt.getDate() + 1);
  return {
    id: randomUUID(),
    tripId: spec.tripId,
    fromUserId: spec.from,
    toUserId: spec.to,
    amountMinor: toMinor(spec.major, "AUD"),
    currencyCode: "AUD",
    method: spec.method,
    status: spec.complete ? "complete" : "pending",
    createdAt: createdAt.toISOString(),
    ...(spec.complete ? { completedAt: completedAt.toISOString() } : {}),
  };
}