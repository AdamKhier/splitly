import { currencyMeta, toMajor } from "./currency.ts";

/**
 * All money in the engine is stored and computed as *integer minor units*
 * (e.g. cents) to avoid floating point drift. Only this module deals with
 * converting to/from human readable decimals.
 */

/** Format a minor-unit amount for display, e.g. 2105 AUD -> "$21.05". */
export function formatMoney(minor: number, code: string, locale = "en-AU"): string {
  const meta = currencyMeta(code);
  const major = toMajor(minor, code);
  const fixed = major.toFixed(meta.minorUnits);
  const sign = minor < 0 ? "-" : "";
  return `${sign}${meta.symbol}${fixed}`;
}

/**
 * Parse a user-typed major-unit string into minor units.
 * Accepts "12.50", "12", "-3.1", "1,234.99".
 */
export function parseToMinor(input: string, code: string): number {
  const meta = currencyMeta(code);
  const cleaned = input.trim().replace(/[, ]/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  const major = Number(cleaned);
  if (!Number.isFinite(major)) {
    throw new Error(`Invalid amount: "${input}"`);
  }
  return Math.round(major * 10 ** meta.minorUnits);
}

export function sumMinor(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}