import { useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";

export type FoldMode = "cover" | "inner";

export const INNER_THRESHOLD = 604;

/**
 * Fold-aware layout hook. On the Galaxy Z Fold 7:
 *  - cover display (closed) is a ~412dp-ish phone → `cover` mode
 *  - inner display (open) is ~673dp wide → `inner` mode (two-column UI)
 * Navigation state lives in the navigator, so unfolding keeps the screen & tab.
 */
export function useFold(): { mode: FoldMode; width: number; height: number } {
  const { width, height } = useWindowDimensions();
  const [mode, setMode] = useState<FoldMode>(width >= INNER_THRESHOLD ? "inner" : "cover");

  useEffect(() => {
    setMode(width >= INNER_THRESHOLD ? "inner" : "cover");
  }, [width]);

  return { mode, width, height };
}