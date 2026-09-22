export interface FieldError {
  field?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errors?: FieldError[];

  constructor(statusCode: number, message: string, errors?: FieldError[]) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = "Bad request", errors?: FieldError[]): AppError {
    return new AppError(400, message, errors);
  }

  static unauthorized(message = "Authentication required. Please log in."): AppError {
    return new AppError(401, message);
  }

  static forbidden(message = "You do not have permission to perform this action"): AppError {
    return new AppError(403, message);
  }

  static notFound(message = "Resource not found"): AppError {
    return new AppError(404, message);
  }

  static conflict(message = "Resource already exists"): AppError {
    return new AppError(409, message);
  }

  static gone(message = "Resource has expired or is no longer available"): AppError {
    return new AppError(410, message);
  }

  static tooManyRequests(message = "Too many requests. Please try again later."): AppError {
    return new AppError(429, message);
  }
}
