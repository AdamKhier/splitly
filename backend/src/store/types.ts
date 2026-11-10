import type { SplitType } from "../engine/split.ts";

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarColor: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  currencyCode: string;
  simplifyDebts: boolean;
  createdByUserId: string;
  createdAt: string;
}

export interface TripMember {
  tripId: string;
  userId: string;
  joinedAt: string;
}

export type SplitInput =
  | { kind: "exact"; exactShares: Record<string, number> }
  | { kind: "percentage"; percentages: Record<string, number> };

export interface Expense {
  id: string;
  tripId: string;
  description: string;
  category: string;
  amountMinor: number;
  currencyCode: string;
  paidByUserId: string;
  splitType: SplitType;
  splitInput?: SplitInput;
  shares: Record<string, number>;
  occurredAt: string;
  createdAt: string;
}

export type SettlementStatus = "pending" | "complete";
export type SettlementMethod = "cash" | "bank" | "payid" | "card" | "other";

export interface Settlement {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: number;
  currencyCode: string;
  method: SettlementMethod;
  note?: string;
  status: SettlementStatus;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentRequest {
  id: string;
  tripId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: number;
  currencyCode: string;
  message?: string;
  createdAt: string;
}

export type NotificationKind =
  | "payment_requested"
  | "expense_added"
  | "payment_settled"
  | "balance_settled"
  | "trip_invite";

export interface AppNotification {
  id: string;
  userId: string;
  kind: NotificationKind;
  tripId?: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface Database {
  users: User[];
  trips: Trip[];
  members: TripMember[];
  expenses: Expense[];
  settlements: Settlement[];
  requests: PaymentRequest[];
  notifications: AppNotification[];
}

export function emptyDatabase(): Database {
  return {
    users: [],
    trips: [],
    members: [],
    expenses: [],
    settlements: [],
    requests: [],
    notifications: [],
  };
}

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarColor: string;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
    ...(user.email ? { email: user.email } : {}),
  };
}