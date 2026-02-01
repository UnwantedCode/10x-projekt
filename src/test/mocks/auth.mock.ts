import { vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";
import type { APIContext } from "astro";

// =============================================================================
// Auth Response Types
// =============================================================================

export interface MockAuthUser {
  id: string;
  email: string;
}

export interface MockAuthResponse {
  data?: {
    user: MockAuthUser | null;
    session?: {
      access_token: string;
      refresh_token: string;
    } | null;
  };
  error?: {
    message: string;
    code?: string;
    status?: number;
  } | null;
}

// =============================================================================
// Sample Data
// =============================================================================

export const sampleUser: MockAuthUser = {
  id: "user-123-uuid",
  email: "test@example.com",
};

export const sampleSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
};

// =============================================================================
// Mock Factory Functions
// =============================================================================

/**
 * Creates a mock Supabase client with configurable auth behavior
 */
export function createMockSupabaseAuth(config?: {
  signInResponse?: MockAuthResponse;
  signUpResponse?: MockAuthResponse;
  signOutResponse?: { error: { message: string } | null };
  getUserResponse?: MockAuthResponse;
}): SupabaseClient {
  const defaultSignInResponse: MockAuthResponse = {
    data: { user: null },
    error: null,
  };

  return {
    auth: {
      signInWithPassword: vi
        .fn()
        .mockResolvedValue(config?.signInResponse ?? defaultSignInResponse),
      signUp: vi.fn().mockResolvedValue(
        config?.signUpResponse ?? {
          data: { user: null },
          error: null,
        }
      ),
      signOut: vi.fn().mockResolvedValue(config?.signOutResponse ?? { error: null }),
      getUser: vi.fn().mockResolvedValue(
        config?.getUserResponse ?? {
          data: { user: null },
          error: null,
        }
      ),
    },
    from: vi.fn(),
  } as unknown as SupabaseClient;
}

/**
 * Creates a successful login response
 */
export function createSuccessfulLoginResponse(
  user: MockAuthUser = sampleUser
): MockAuthResponse {
  return {
    data: {
      user,
      session: sampleSession,
    },
    error: null,
  };
}

/**
 * Creates a failed login response with invalid credentials
 */
export function createInvalidCredentialsResponse(): MockAuthResponse {
  return {
    data: { user: null },
    error: { message: "Invalid login credentials" },
  };
}

/**
 * Creates a failed login response with unconfirmed email
 */
export function createEmailNotConfirmedResponse(): MockAuthResponse {
  return {
    data: { user: null },
    error: { message: "Email not confirmed" },
  };
}

/**
 * Creates a successful registration response
 */
export function createSuccessfulSignUpResponse(
  user: MockAuthUser = sampleUser
): MockAuthResponse {
  return {
    data: {
      user,
      session: null, // No session until email confirmed
    },
    error: null,
  };
}

/**
 * Creates a failed registration response (user already exists)
 */
export function createUserExistsResponse(): MockAuthResponse {
  return {
    data: { user: null },
    error: { message: "User already registered" },
  };
}

// =============================================================================
// API Context Mock Factory
// =============================================================================

/**
 * Creates a mock APIContext for Astro API endpoint testing
 */
export function createMockAPIContext(
  options: {
    body?: unknown;
    supabase?: SupabaseClient;
    url?: string;
    method?: string;
  } = {}
): APIContext {
  const supabase = options.supabase ?? createMockSupabaseAuth();

  return {
    request: {
      json: vi.fn().mockResolvedValue(options.body ?? {}),
      method: options.method ?? "POST",
    } as unknown as Request,
    locals: {
      supabase,
    },
    cookies: {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    } as unknown as APIContext["cookies"],
    params: {},
    url: new URL(options.url ?? "http://localhost/api/auth/login"),
    site: new URL("http://localhost"),
    generator: "test",
    props: {},
    redirect: vi.fn(),
    rewrite: vi.fn(),
    clientAddress: "127.0.0.1",
    currentLocale: "pl",
    preferredLocale: "pl",
    preferredLocaleList: ["pl"],
    routePattern: "/api/auth/login",
    isPrerendered: false,
    originPathname: "/api/auth/login",
    getActionResult: vi.fn(),
    callAction: vi.fn(),
  } as unknown as APIContext;
}

// =============================================================================
// Login Form Test Data
// =============================================================================

export const validLoginCredentials = {
  email: "user@example.com",
  password: "password123",
};

export const invalidEmails = [
  "",
  "   ",
  "invalid",
  "user@",
  "@example.com",
  "user@.com",
  "user @example.com",
  "user@example",
];

export const invalidPasswords = ["", "12345", "a", "ab", "abc", "abcd", "abcde"];

export const validEmails = [
  "user@example.com",
  "user.name@example.com",
  "user+tag@example.com",
  "user@mail.example.com",
  "user@subdomain.example.co.uk",
];

export const validPasswords = [
  "123456",
  "password",
  "very-long-password-with-special-chars!@#$%",
  "a".repeat(100),
];

// =============================================================================
// Response Helpers
// =============================================================================

/**
 * Parses JSON from Response object
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

/**
 * Asserts that response is a successful JSON response
 */
export async function expectSuccessResponse(
  response: Response,
  expectedStatus = 200
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers.get("Content-Type")).toBe("application/json");
  const data = await parseJsonResponse(response);
  expect(data).toBeDefined();
  return data;
}

/**
 * Asserts that response is an error JSON response
 */
export async function expectErrorResponse(
  response: Response,
  expectedStatus: number,
  expectedErrorContains?: string
) {
  expect(response.status).toBe(expectedStatus);
  expect(response.headers.get("Content-Type")).toBe("application/json");
  const data = await parseJsonResponse<{ error: string }>(response);
  expect(data.error).toBeDefined();
  if (expectedErrorContains) {
    expect(data.error).toContain(expectedErrorContains);
  }
  return data;
}
