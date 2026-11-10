/**
 * Balance computation. Given a trip's expenses (with per-person shares) and its
 * recorded settlements, derive what everyone is owed and who should pay whom.
 *
 * Three outputs:
 *  - individual balances: how much each person paid vs. should have paid, and
 *    their net position (positive = a creditor, negative = a debtor)
 *  - flows: concrete "pay this person" directions, either itemized per expense
 *    or debt-simplified to the fewest transfers
 */

import { simplifyDebts, type DebtFlow } from "./simplify.ts";

export interface BalanceExpenseInput {
  id?: string;
  paidBy: string;
  totalMinor: number;
  shares: Readonly<Record<string, number>>;
}

export interface BalanceSettlementInput {
  from: string;
  to: string;
  amountMinor: number;
}

export interface IndividualItem {
  participantId: string;
  paidMinor: number;
  shareMinor: number;
  netMinor: number;
}

export interface Flow {
  from: string;
  to: string;
  amountMinor: number;
  expenseId?: string;
}

export interface BalancesResult {
  simplified: boolean;
  individual: IndividualItem[];
  flows: Flow[];
}

export interface ComputeOptions {
  /** true = debt-simplified flows; false = itemized, per-expense flows */
  simplify: boolean;
}

export function computeBalances(
  expenses: readonly BalanceExpenseInput[],
  settlements: readonly BalanceSettlementInput[],
  options: ComputeOptions,
): BalancesResult {
  const paid: Record<string, number> = {};
  const share: Record<string, number> = {};

  for (const expense of expenses) {
    paid[expense.paidBy] = (paid[expense.paidBy] ?? 0) + expense.totalMinor;
    for (const [participant, amount] of Object.entries(expense.shares)) {
      share[participant] = (share[participant] ?? 0) + amount;
    }
  }

  const participants = new Set<string>([
    ...Object.keys(paid),
    ...Object.keys(share),
    ...settlements.flatMap((s) => [s.from, s.to]),
  ]);

  // A settlement from X to Y discharges Y's claim on X: X's net rises by the
  // amount, Y's net falls by the same amount.
  const adjusted: Record<string, number> = {};
  for (const participantId of participants) {
    adjusted[participantId] = (paid[participantId] ?? 0) - (share[participantId] ?? 0);
  }
  for (const settlement of settlements) {
    adjusted[settlement.to] = (adjusted[settlement.to] ?? 0) - settlement.amountMinor;
    adjusted[settlement.from] = (adjusted[settlement.from] ?? 0) + settlement.amountMinor;
  }

  const individual: IndividualItem[] = [...participants].map((participantId) => ({
    participantId,
    paidMinor: paid[participantId] ?? 0,
    shareMinor: share[participantId] ?? 0,
    netMinor: adjusted[participantId] ?? 0,
  }));

  let flows: Flow[];
  if (options.simplify) {
    const net: Record<string, number> = {};
    for (const item of individual) {
      if (item.netMinor !== 0) net[item.participantId] = item.netMinor;
    }
    const debtFlows: DebtFlow[] = simplifyDebts(net);
    flows = debtFlows.map((f) => ({ ...f }));
  } else {
    flows = [];
    for (const expense of expenses) {
      for (const [participant, amountMinor] of Object.entries(expense.shares)) {
        if (participant !== expense.paidBy && amountMinor > 0) {
          flows.push({
            from: participant,
            to: expense.paidBy,
            amountMinor,
            ...(expense.id ? { expenseId: expense.id } : {}),
          });
        }
      }
    }
  }

  return { simplified: options.simplify, individual, flows };
}