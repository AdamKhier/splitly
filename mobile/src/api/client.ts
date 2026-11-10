import type {
  ApiUser,
  BalancesView,
  ExpenseView,
  NotificationView,
  RequestView,
  SettlementView,
  TimelineEvent,
  TripDetail,
  TripListItem,
  SplitType,
} from "./dto";

export const DEFAULT_API_URL = "http://localhost:4000";

export function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.trim().length > 0) return fromEnv.trim();
  return DEFAULT_API_URL;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly issues?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface SessionSnapshot {
  token: string;
  user: ApiUser;
}

export class ApiClient {
  readonly baseUrl: string;
  token: string | null = null;
  user: ApiUser | null = null;

  constructor(baseUrl = resolveApiUrl()) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  setSession(session: SessionSnapshot | null): void {
    this.token = session?.token ?? null;
    this.user = session?.user ?? null;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, { ...init, headers, signal: controller.signal });
    } catch (err) {
      const timedOut = controller.signal.aborted;
      const reason = err instanceof Error ? err.message : String(err);
      throw new ApiError(
        timedOut
          ? `Timed out waiting for the API at ${this.baseUrl}${path}. Is the backend running and reachable from this device?`
          : `Network error reaching ${this.baseUrl} (${reason}). Check EXPO_PUBLIC_API_URL, your Wi-Fi, and that the backend is running.`,
        undefined,
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      let issues: ApiError["issues"];
      try {
        const body = (await res.json()) as { error?: string; issues?: ApiError["issues"] };
        if (body.error) message = body.error;
        issues = body.issues;
      } catch {
        // empty body
      }
      throw new ApiError(message, res.status, issues);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  // --- auth ---

  authDemo(username?: string, displayName?: string): Promise<{ token: string; user: ApiUser }> {
    return this.request("/api/auth/demo", {
      method: "POST",
      body: JSON.stringify({ ...(username ? { username } : {}), ...(displayName ? { displayName } : {}) }),
    });
  }

  me(): Promise<{ user: ApiUser }> {
    return this.request("/api/users/me");
  }

  searchUsers(q: string): Promise<{ users: ApiUser[] }> {
    return this.request(`/api/users/search?q=${encodeURIComponent(q)}`);
  }

  // --- notifications ---

  notifications(): Promise<{ notifications: NotificationView[] }> {
    return this.request("/api/users/notifications");
  }

  markNotificationRead(id: string): Promise<{ notification: NotificationView }> {
    return this.request(`/api/users/notifications/${id}/read`, { method: "PATCH" });
  }

  markAllNotificationsRead(): Promise<{ notifications: NotificationView[] }> {
    return this.request("/api/users/notifications/read-all", { method: "POST" });
  }

  // --- trips ---

  myTrips(): Promise<{ trips: TripListItem[] }> {
    return this.request("/api/trips");
  }

  trip(id: string): Promise<{ trip: TripDetail }> {
    return this.request(`/api/trips/${id}`);
  }

  createTrip(input: { name: string; description?: string; currencyCode?: string }): Promise<{ trip: TripDetail }> {
    return this.request("/api/trips", { method: "POST", body: JSON.stringify(input) });
  }

  updateTrip(id: string, patch: { name?: string; description?: string | null; currencyCode?: string; simplifyDebts?: boolean }): Promise<{ trip: TripDetail }> {
    return this.request(`/api/trips/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  }

  deleteTrip(id: string): Promise<{ ok: boolean }> {
    return this.request(`/api/trips/${id}`, { method: "DELETE" });
  }

  addMember(id: string, input: { username: string; displayName?: string; email?: string }): Promise<{ trip: TripDetail }> {
    return this.request(`/api/trips/${id}/members`, { method: "POST", body: JSON.stringify(input) });
  }

  removeMember(id: string, userId: string): Promise<{ trip: TripDetail }> {
    return this.request(`/api/trips/${id}/members/${userId}`, { method: "DELETE" });
  }

  timeline(id: string): Promise<{ events: TimelineEvent[] }> {
    return this.request(`/api/trips/${id}/timeline`);
  }

  balances(id: string, simplify?: boolean): Promise<{ balances: BalancesView }> {
    const q = simplify === undefined ? "" : `?simplify=${simplify}`;
    return this.request(`/api/trips/${id}/balances${q}`);
  }

  // --- expenses ---

  expenses(tripId: string): Promise<{ expenses: ExpenseView[] }> {
    return this.request(`/api/trips/${tripId}/expenses`);
  }

  expense(tripId: string, id: string): Promise<{ expense: ExpenseView }> {
    return this.request(`/api/trips/${tripId}/expenses/${id}`);
  }

  createExpense(
    tripId: string,
    input: {
      description: string;
      amount: number;
      category: string;
      paidByUserId: string;
      splitType: SplitType;
      split: { among: string[]; exact?: Record<string, number>; percentages?: Record<string, number> };
      occurredAt?: string;
    },
  ): Promise<{ expense: ExpenseView }> {
    return this.request(`/api/trips/${tripId}/expenses`, { method: "POST", body: JSON.stringify(input) });
  }

  updateExpense(
    tripId: string,
    id: string,
    input: {
      description: string;
      amount: number;
      category: string;
      paidByUserId: string;
      splitType: SplitType;
      split: { among: string[]; exact?: Record<string, number>; percentages?: Record<string, number> };
      occurredAt?: string;
    },
  ): Promise<{ expense: ExpenseView }> {
    return this.request(`/api/trips/${tripId}/expenses/${id}`, { method: "PATCH", body: JSON.stringify(input) });
  }

  deleteExpense(tripId: string, id: string): Promise<{ ok: boolean }> {
    return this.request(`/api/trips/${tripId}/expenses/${id}`, { method: "DELETE" });
  }

  // --- settlements ---

  settlements(tripId: string): Promise<{ settlements: SettlementView[] }> {
    return this.request(`/api/trips/${tripId}/settlements`);
  }

  createSettlement(
    tripId: string,
    input: { fromUserId: string; toUserId: string; amount: number; method?: string; note?: string },
  ): Promise<{ settlement: SettlementView }> {
    return this.request(`/api/trips/${tripId}/settlements`, { method: "POST", body: JSON.stringify(input) });
  }

  updateSettlement(
    tripId: string,
    id: string,
    patch: { status?: "pending" | "complete"; method?: string; note?: string | null },
  ): Promise<{ settlement: SettlementView }> {
    return this.request(`/api/trips/${tripId}/settlements/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
  }

  deleteSettlement(tripId: string, id: string): Promise<{ ok: boolean }> {
    return this.request(`/api/trips/${tripId}/settlements/${id}`, { method: "DELETE" });
  }

  // --- requests ---

  requests(tripId: string): Promise<{ requests: RequestView[] }> {
    return this.request(`/api/trips/${tripId}/requests`);
  }

  createRequest(tripId: string, input: { toUserId: string; amount: number; message?: string }): Promise<{ request: RequestView }> {
    return this.request(`/api/trips/${tripId}/requests`, { method: "POST", body: JSON.stringify(input) });
  }

  deleteRequest(tripId: string, id: string): Promise<{ ok: boolean }> {
    return this.request(`/api/trips/${tripId}/requests/${id}`, { method: "DELETE" });
  }
}