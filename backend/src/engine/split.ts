/**
 * The split engine — turns a total plus a splitting rule into exact per-person
 * shares, always expressed in integer minor units and always summing exactly to
 * the total. The "we'll handle the math" core.
 */

export type SplitType = "equal" | "exact" | "percentage";

export const SPLIT_TYPES: readonly SplitType[] = ["equal", "exact", "percentage"];

const EPSILON = 1e-9;
const PERCENT_TOLERANCE = 0.01;

/**
 * Equal split: every participant gets total/count, rounded so that the shares
 * still sum exactly to `totalMinor`. Extra minor units (from rounding down) are
 * distributed one at a time to the first participants, deterministically.
 */
export function splitEqual(totalMinor: number, count: number): number[] {
  if (!Number.isInteger(totalMinor)) throw new Error("totalMinor must be an integer");
  if (!Number.isInteger(count) || count <= 0) throw new Error("count must be a positive integer");
  if (totalMinor < 0) throw new Error("totalMinor cannot be negative");

  const each = Math.floor(totalMinor / count);
  const remainder = totalMinor - each * count;
  return Array.from({ length: count }, (_, i) => each + (i < remainder ? 1 : 0));
}

/**
 * Exact split: each participant has a fixed amount. The amounts must be
 * non-negative integers summing exactly to the total.
 */
export function splitExact(totalMinor: number, exactShares: number[]): number[] {
  if (!Number.isInteger(totalMinor) || totalMinor < 0) throw new Error("invalid totalMinor");
  if (exactShares.length === 0) throw new Error("exactShares cannot be empty");

  const total = exactShares.reduce((a, b) => a + b, 0);
  if (total !== totalMinor) {
    throw new Error(
      `Exact shares sum to ${total} but expense total is ${totalMinor} (difference ${totalMinor - total})`,
    );
  }
  return exactShares.map((share) => {
    if (!Number.isInteger(share) || share < 0) {
      throw new Error("exact shares must be non-negative integers");
    }
    return share;
  });
}

/**
 * Percentage split: each participant gets their percentage of the total.
 * Percentages are floats (e.g. 33.33). The result is rounded to integer minor
 * units using the largest-remainder method so the shares sum exactly to the
 * total regardless of rounding.
 */
export function splitPercentage(totalMinor: number, percentages: number[]): number[] {
  if (!Number.isInteger(totalMinor) || totalMinor < 0) throw new Error("invalid totalMinor");
  if (percentages.length === 0) throw new Error("percentages cannot be empty");

  const sum = percentages.reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > PERCENT_TOLERANCE) {
    throw new Error(`Percentages sum to ${sum.toFixed(2)}%, must be 100%`);
  }

  const raw = percentages.map((p) => {
    if (!Number.isFinite(p) || p < 0) throw new Error("percentages must be non-negative");
    return (totalMinor * p) / 100;
  });

  const floors = raw.map((r) => Math.floor(r + EPSILON));
  let leftover = totalMinor - floors.reduce((a, b) => a + b, 0);
  const result = [...floors];

  const fracIndex = floors
    .map((f, i) => ({ frac: raw[i]! - f, index: i }))
    .filter((x) => x.frac > EPSILON)
    .sort((a, b) => b.frac - a.frac);

  for (const { index } of fracIndex) {
    if (leftover === 0) break;
    result[index]! += 1;
    leftover -= 1;
  }
  if (leftover !== 0) {
    throw new Error("Internal error: percentage split did not balance exactly");
  }
  return result;
}

/** Dispatch to the right tile split strategy. */
export function split(
  type: SplitType,
  totalMinor: number,
  spec: { count?: number; exactShares?: number[]; percentages?: number[] },
): number[] {
  switch (type) {
    case "equal":
      if (spec.count === undefined) throw new Error("equal split requires a count");
      return splitEqual(totalMinor, spec.count);
    case "exact":
      return splitExact(totalMinor, spec.exactShares ?? []);
    case "percentage":
      return splitPercentage(totalMinor, spec.percentages ?? []);
  }
}