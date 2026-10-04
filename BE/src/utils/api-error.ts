export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(msg: string) {
    return new ApiError(400, msg);
  }
  static notFound(msg = "Resource not found") {
    return new ApiError(404, msg);
  }
  static tooMany(msg = "Too many requests") {
    return new ApiError(429, msg);
  }
  static internal(msg = "Internal server error") {
    return new ApiError(500, msg);
  }
}
