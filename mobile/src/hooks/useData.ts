import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal data hook: fetches on mount and exposes reload() + refresh() (silent).
 * Wrap the loader to normalise errors into a string message.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async (silent: boolean) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const result = await loaderRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run(true), [run]);

  return { data, loading, refreshing, error, reload };
}