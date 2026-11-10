/**
 * Debt simplification — given each member's *net* balance relative to the
 * group, produce the smallest practical set of "who pays whom" transfers that
 * fully settles everyone.
 *
 * Contract: members with `netMinor > 0` are creditors (money is owed to them),
 * members with `netMinor < 0` are debtors. The flows returned describe money
 * moving from a debtor `from` to a creditor `to`; applying all flows zeroes
 * every balance.
 *
 * Strategy: for groups up to DS_DP_MAX members we partition the members into
 * the maximum number of zero-sum subsets (DP over masks), then settle each
 * subset greedily — that provably minimises the number of transfers. Larger
 * groups fall back to a greedy max-debtor ↔ max-creditor match, which is what
 * most expense apps do and is fast.
 */

export interface DebtFlow {
  from: string;
  to: string;
  amountMinor: number;
}

const DS_DP_MAX = 16;

interface BalanceEntry {
  id: string;
  net: number;
}

export function simplifyDebts(net: Readonly<Record<string, number>>): DebtFlow[] {
  const entries: BalanceEntry[] = Object.keys(net)
    .filter((id) => net[id] !== 0)
    .sort()
    .map((id) => ({ id, net: net[id]! }));

  const n = entries.length;
  if (n === 0) return [];
  if (n > DS_DP_MAX) return settleByGreedy(entries);
  return settleByPartition(entries);
}

/** Settle one zero-sum subset: repeatedly match biggest creditor with biggest debtor. */
function greedySettle(entries: BalanceEntry[]): DebtFlow[] {
  const flows: DebtFlow[] = [];
  const bal = entries.map((e) => e.net);
  while (true) {
    let iMax = -1;
    let iMin = -1;
    for (let i = 0; i < bal.length; i++) {
      const v = bal[i]!;
      if (v > 0 && (iMax === -1 || v > bal[iMax]!)) iMax = i;
      if (v < 0 && (iMin === -1 || v < bal[iMin]!)) iMin = i;
    }
    if (iMax === -1 || iMin === -1) break;
    const amount = Math.min(bal[iMax]!, -bal[iMin]!);
    if (amount <= 0) break;
    flows.push({ from: entries[iMin]!.id, to: entries[iMax]!.id, amountMinor: amount });
    bal[iMax]! -= amount;
    bal[iMin]! += amount;
  }
  return flows;
}

function settleByGreedy(entries: BalanceEntry[]): DebtFlow[] {
  return greedySettle(entries);
}

function settleByPartition(entries: BalanceEntry[]): DebtFlow[] {
  const n = entries.length;
  const totalMasks = 1 << n;

  const subsetSum = new Int32Array(totalMasks);
  subsetSum[0] = 0;
  for (let mask = 1; mask < totalMasks; mask++) {
    const low = mask & -mask;
    const idx = 31 - Math.clz32(low);
    subsetSum[mask] = (subsetSum[mask ^ low] ?? 0) + Math.trunc(entries[idx]!.net);
  }

  const memo = new Int32Array(totalMasks).fill(-1);
  const choice = new Int32Array(totalMasks);

  const maxGroups = (mask: number): number => {
    if (mask === 0) return 0;
    const cached = memo[mask];
    if ((cached ?? -1) !== -1) return cached!;
    let best = 0;
    let bestSub = 0;
    for (let s = mask; s > 0; s = (s - 1) & mask) {
      if ((subsetSum[s] ?? 0) === 0) {
        const candidate = 1 + maxGroups(mask ^ s);
        if (candidate > best) {
          best = candidate;
          bestSub = s;
        }
      }
    }
    memo[mask] = best;
    choice[mask] = bestSub;
    return best;
  };

  maxGroups(totalMasks - 1);

  const flows: DebtFlow[] = [];
  let remaining = totalMasks - 1;
  while (remaining !== 0) {
    const group = choice[remaining] ?? 0;
    if (group === 0) break;
    const members: BalanceEntry[] = [];
    for (let i = 0; i < n; i++) {
      if ((group & (1 << i)) !== 0) members.push(entries[i]!);
    }
    if (members.length > 1) flows.push(...greedySettle(members));
    remaining ^= group;
  }
  return flows;
}