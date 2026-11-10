import type { RequestHandler } from "express";
import type { Trip, User } from "../store/types.ts";
import type { AppContext } from "./context.ts";
import { ApiError, forbidden, notFound } from "./errors.ts";
import { verifyToken } from "./auth.ts";

export function requiredParam(value: string | undefined, name: string): string {
  if (!value) throw new ApiError(400, `Missing path parameter: ${name}`);
  return value;
}

export function requireAuth(ctx: AppContext): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
      return next(new ApiError(401, "Missing bearer token"));
    }
    const payload = verifyToken(token, ctx.tokenSecret);
    if (!payload) {
      return next(new ApiError(401, "Invalid or expired token"));
    }
    req.userId = payload.uid;
    next();
  };
}

export async function loadCurrentUser(ctx: AppContext, userId: string): Promise<User> {
  const user = await ctx.store.getUserById(userId);
  if (!user) throw new ApiError(401, "User no longer exists");
  return user;
}

export async function requireMemberTrip(
  ctx: AppContext,
  userId: string | undefined,
  tripId: string | undefined,
): Promise<Trip> {
  if (!tripId) notFound("Trip not found");
  const trip = await ctx.store.getTrip(tripId);
  if (!trip) notFound("Trip not found");
  if (!userId || !(await ctx.store.isMember(tripId, userId))) {
    forbidden("You are not a member of this trip");
  }
  return trip;
}

export async function requireCreatorTrip(
  ctx: AppContext,
  userId: string | undefined,
  tripId: string | undefined,
): Promise<Trip> {
  const trip = await requireMemberTrip(ctx, userId, tripId);
  if (trip.createdByUserId !== userId) forbidden("Only the trip creator can do that");
  return trip;
}