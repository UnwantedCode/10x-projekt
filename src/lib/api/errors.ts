/**
 * API Error classes for dashboard
 */

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Error thrown when user is not authenticated (401)
 * Should trigger redirect to login page
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Sesja wygasła. Zaloguj się ponownie.") {
    super(message, 401);
    this.name = "UnauthorizedError";
  }
}

/**
 * Error thrown when requested resource is not found (404)
 */
export class NotFoundError extends ApiError {
  constructor(message = "Nie znaleziono zasobu.") {
    super(message, 404);
    this.name = "NotFoundError";
  }
}

/**
 * Error thrown when validation fails (400)
 */
export class ValidationError extends ApiError {
  constructor(
    message: string,
    public details?: Record<string, string>
  ) {
    super(message, 400);
    this.name = "ValidationError";
  }
}

/**
 * Error thrown when there's a conflict (409)
 * e.g., duplicate list name
 */
export class ConflictError extends ApiError {
  constructor(message = "Konflikt danych.") {
    super(message, 409);
    this.name = "ConflictError";
  }
}

/**
 * Error thrown when server returns 5xx error
 */
export class ServerError extends ApiError {
  constructor(message = "Błąd serwera. Spróbuj ponownie później.") {
    super(message, 500);
    this.name = "ServerError";
  }
}

/**
 * Error thrown when network request fails
 */
export class NetworkError extends ApiError {
  constructor(message = "Błąd połączenia. Sprawdź połączenie z internetem.") {
    super(message);
    this.name = "NetworkError";
  }
}

/**
 * Type guard to check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if error is unauthorized
 */
export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Handles unauthorized error by redirecting to login
 */
export function handleUnauthorizedError(redirectPath = "/app"): void {
  window.location.href = `/login?redirectTo=${encodeURIComponent(redirectPath)}`;
}

/**
 * Gets user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Wystąpił nieoczekiwany błąd.";
}
