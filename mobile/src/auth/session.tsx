import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiClient, resolveApiUrl } from "../api/client";
import type { ApiUser } from "../api/dto";

const SESSION_KEY = "splitly.session.v1";

interface SessionState {
  user: ApiUser;
  token: string;
}

interface SessionContextValue {
  api: ApiClient;
  user: ApiUser | null;
  loading: boolean;
  signIn: (username?: string, displayName?: string) => Promise<ApiUser>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => new ApiClient(resolveApiUrl()), []);
  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SESSION_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as SessionState;
            if (parsed?.token && parsed?.user) {
              api.setSession(parsed);
              setState(parsed);
            }
          } catch {
            // ignore corrupt storage
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const signIn = useCallback(
    async (username?: string, displayName?: string) => {
      const result = await api.authDemo(username, displayName);
      const next: SessionState = { token: result.token, user: result.user };
      api.setSession(next);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
      setState(next);
      return result.user;
    },
    [api],
  );

  const signOut = useCallback(async () => {
    api.setSession(null);
    await AsyncStorage.removeItem(SESSION_KEY);
    setState(null);
  }, [api]);

  const value = useMemo<SessionContextValue>(
    () => ({ api, user: state?.user ?? null, loading, signIn, signOut }),
    [api, state, loading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}