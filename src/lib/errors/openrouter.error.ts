export type OpenRouterErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "INSUFFICIENT_CREDITS"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "TIMEOUT"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "EMPTY_RESPONSE"
  | "INVALID_CONFIG"
  | "UNKNOWN_ERROR";

export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly code: OpenRouterErrorCode,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "OpenRouterError";
  }

  get isRetryable(): boolean {
    return ["RATE_LIMITED", "SERVICE_UNAVAILABLE", "TIMEOUT", "NETWORK_ERROR"].includes(this.code);
  }

  get isConfigError(): boolean {
    return ["UNAUTHORIZED", "INSUFFICIENT_CREDITS", "INVALID_CONFIG"].includes(this.code);
  }
}
