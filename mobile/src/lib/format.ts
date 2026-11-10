import { CURRENCIES } from "../theme/theme";

const NAMED = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 2 });

export function formatMoney(minor: number, code: string): string {
  const meta = CURRENCIES[code] ?? CURRENCIES.AUD!;
  const major = minor / 10 ** meta.minorUnits;
  const sign = minor < 0 ? "-" : "";
  return `${sign}${meta.symbol}${major.toFixed(meta.minorUnits)}`;
}

export function formatMajor(major: number, code: string): string {
  const meta = CURRENCIES[code] ?? CURRENCIES.AUD!;
  return `${meta.symbol}${NAMED.format(major)}`;
}

export function majorToMinor(input: string, code: string): number {
  const meta = CURRENCIES[code] ?? CURRENCIES.AUD!;
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!/^(\d+\.?\d*|\.\d+)$/.test(cleaned)) return NaN;
  return Math.round(Number(cleaned) * 10 ** meta.minorUnits);
}

export function minorToMajorString(minor: number, code: string): string {
  const meta = CURRENCIES[code] ?? CURRENCIES.AUD!;
  return (minor / 10 ** meta.minorUnits).toFixed(meta.minorUnits).replace(/\.?0+$/, "");
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}