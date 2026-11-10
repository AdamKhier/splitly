export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details ?? undefined;
  }
}

export function notFound(message = "Not found"): never {
  throw new ApiError(404, message);
}

export function forbidden(message = "Not allowed"): never {
  throw new ApiError(403, message);
}

export function badRequest(message: string, details?: unknown): never {
  throw new ApiError(400, message, details);
}