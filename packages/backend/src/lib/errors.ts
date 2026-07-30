export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Unauthorized = (message = "Unauthorized") => new AppError(401, message, "UNAUTHORIZED");
export const Forbidden = (message = "Forbidden") => new AppError(403, message, "FORBIDDEN");
export const NotFound = (message = "Not found") => new AppError(404, message, "NOT_FOUND");
export const Conflict = (message = "Conflict") => new AppError(409, message, "CONFLICT");
export const BadRequest = (message = "Bad request") => new AppError(400, message, "BAD_REQUEST");
