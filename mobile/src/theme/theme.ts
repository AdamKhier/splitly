export const colors = {
  primary: "#6C5CE7",
  primaryDark: "#5A4BD1",
  primarySoft: "#EEEAFD",
  success: "#00B894",
  successSoft: "#E2F8F1",
  danger: "#E17055",
  dangerSoft: "#FDEBE6",
  warn: "#FDCB6E",
  bg: "#F7F6FB",
  surface: "#FFFFFF",
  text: "#1A1829",
  textMuted: "#7B7890",
  textFaint: "#B4B1C6",
  border: "#ECEBF4",
  shadow: "#6C5CE7",
  white: "#FFFFFF",
  overlay: "rgba(26, 24, 41, 0.45)",
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const fontSizes = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  display: 34,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  fab: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

export const CURRENCIES: Record<string, { symbol: string; minorUnits: number; name: string }> = {
  AUD: { symbol: "$", minorUnits: 2, name: "Australian Dollar" },
  USD: { symbol: "$", minorUnits: 2, name: "US Dollar" },
  EUR: { symbol: "€", minorUnits: 2, name: "Euro" },
  GBP: { symbol: "£", minorUnits: 2, name: "British Pound" },
  NZD: { symbol: "$", minorUnits: 2, name: "New Zealand Dollar" },
  CAD: { symbol: "$", minorUnits: 2, name: "Canadian Dollar" },
  SGD: { symbol: "$", minorUnits: 2, name: "Singapore Dollar" },
  HKD: { symbol: "HK$", minorUnits: 2, name: "Hong Kong Dollar" },
  CNY: { symbol: "¥", minorUnits: 2, name: "Chinese Yuan" },
  MYR: { symbol: "RM", minorUnits: 2, name: "Malaysian Ringgit" },
  THB: { symbol: "฿", minorUnits: 2, name: "Thai Baht" },
  INR: { symbol: "₹", minorUnits: 2, name: "Indian Rupee" },
  IDR: { symbol: "Rp", minorUnits: 2, name: "Indonesian Rupiah" },
  JPY: { symbol: "¥", minorUnits: 0, name: "Japanese Yen" },
  KRW: { symbol: "₩", minorUnits: 0, name: "South Korean Won" },
  VND: { symbol: "₫", minorUnits: 0, name: "Vietnamese Đồng" },
};