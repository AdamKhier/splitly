export interface CurrencyMeta {
  code: string;
  symbol: string;
  name: string;
  minorUnits: 0 | 1 | 2 | 3;
}

export const CURRENCIES: Record<string, CurrencyMeta> = {
  AUD: { code: "AUD", symbol: "$", name: "Australian Dollar", minorUnits: 2 },
  USD: { code: "USD", symbol: "$", name: "US Dollar", minorUnits: 2 },
  EUR: { code: "EUR", symbol: "€", name: "Euro", minorUnits: 2 },
  GBP: { code: "GBP", symbol: "£", name: "British Pound", minorUnits: 2 },
  NZD: { code: "NZD", symbol: "$", name: "New Zealand Dollar", minorUnits: 2 },
  CAD: { code: "CAD", symbol: "$", name: "Canadian Dollar", minorUnits: 2 },
  SGD: { code: "SGD", symbol: "$", name: "Singapore Dollar", minorUnits: 2 },
  HKD: { code: "HKD", symbol: "HK$", name: "Hong Kong Dollar", minorUnits: 2 },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan", minorUnits: 2 },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", minorUnits: 2 },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht", minorUnits: 2 },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee", minorUnits: 2 },
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", minorUnits: 2 },
  PHP: { code: "PHP", symbol: "₱", name: "Philippine Peso", minorUnits: 2 },
  NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone", minorUnits: 2 },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona", minorUnits: 2 },
  DKK: { code: "DKK", symbol: "kr", name: "Danish Krone", minorUnits: 2 },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc", minorUnits: 2 },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Złoty", minorUnits: 2 },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen", minorUnits: 0 },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won", minorUnits: 0 },
  VND: { code: "VND", symbol: "₫", name: "Vietnamese Đồng", minorUnits: 0 },
  EGP: { code: "EGP", symbol: "E£", name: "Egyptian Pound", minorUnits: 2 },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham", minorUnits: 2 },
};

export const DEFAULT_CURRENCY = "AUD";

export function currencyMeta(code: string): CurrencyMeta {
  const meta = CURRENCIES[code.toUpperCase()];
  assertCurrency(code, meta);
  return meta;
}

export function isSupportedCurrency(code: string): code is keyof typeof CURRENCIES {
  return Boolean(CURRENCIES[code.toUpperCase()]);
}

function assertCurrency(code: string, meta: CurrencyMeta | undefined): asserts meta is CurrencyMeta {
  if (!meta) {
    throw new Error(`Unsupported currency: ${code}`);
  }
}

/** Minor-unit scale factor for a currency, e.g. 2 -> "21.05 major" stored as 2105 minor. */
export function minorScale(meta: CurrencyMeta): number {
  return 10 ** meta.minorUnits;
}

export function toMinor(major: number, code: string): number {
  const meta = currencyMeta(code);
  return Math.round(major * minorScale(meta));
}

export function toMajor(minor: number, code: string): number {
  const meta = currencyMeta(code);
  return minor / minorScale(meta);
}