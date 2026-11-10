import type { Store } from "../store/store.ts";

/** Everything the API layer needs, all plumbed in from bootstrap. */
export interface AppContext {
  store: Store;
  tokenSecret: string;
}

export type AsyncRoute = (
  req: Parameters<import("express").RequestHandler>[0],
  res: Parameters<import("express").RequestHandler>[1],
  next: Parameters<import("express").RequestHandler>[2],
) => Promise<unknown>;

export function asyncHandler(handler: AsyncRoute): import("express").RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}