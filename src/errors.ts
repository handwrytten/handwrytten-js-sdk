/** Exception classes for the Handwrytten SDK. */

export class HandwryttenError extends Error {
  /** HTTP status code, if available. */
  readonly statusCode: number | null;
  /** Parsed response body, if available. */
  readonly responseBody: unknown;

  constructor(
    message = "An error occurred with the Handwrytten API",
    statusCode: number | null = null,
    responseBody: unknown = null,
  ) {
    super(message);
    this.name = "HandwryttenError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }

  override toString(): string {
    const parts = [this.message];
    if (this.statusCode) parts.push(`(HTTP ${this.statusCode})`);
    return parts.join(" ");
  }
}

/** Raised when API authentication fails (401/403). */
export class AuthenticationError extends HandwryttenError {
  constructor(
    message = "Invalid or missing API key",
    statusCode: number | null = null,
    responseBody: unknown = null,
  ) {
    super(message, statusCode, responseBody);
    this.name = "AuthenticationError";
  }
}

/** Raised when the request is malformed or has invalid parameters (400). */
export class BadRequestError extends HandwryttenError {
  constructor(
    message = "Bad request",
    statusCode: number | null = null,
    responseBody: unknown = null,
  ) {
    super(message, statusCode, responseBody);
    this.name = "BadRequestError";
  }
}

/** Raised when the requested resource is not found (404). */
export class NotFoundError extends HandwryttenError {
  constructor(
    message = "Resource not found",
    statusCode: number | null = null,
    responseBody: unknown = null,
  ) {
    super(message, statusCode, responseBody);
    this.name = "NotFoundError";
  }
}

/** Raised when rate limit is exceeded (429). */
export class RateLimitError extends HandwryttenError {
  /** Seconds to wait before retrying, if provided by the API. */
  readonly retryAfter: number | null;

  constructor(
    message = "Rate limit exceeded. Please retry after a delay.",
    statusCode: number | null = 429,
    responseBody: unknown = null,
    retryAfter: number | null = null,
  ) {
    super(message, statusCode, responseBody);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/** Raised when the Handwrytten API returns a server error (5xx). */
export class ServerError extends HandwryttenError {
  constructor(
    message = "Handwrytten server error",
    statusCode: number | null = null,
    responseBody: unknown = null,
  ) {
    super(message, statusCode, responseBody);
    this.name = "ServerError";
  }
}
