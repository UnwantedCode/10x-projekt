import { describe, it, expect, vi, beforeEach } from "vitest";
import type { APIContext } from "astro";
import type { SupabaseClient } from "@/db/supabase.client";

// =============================================================================
// Dynamic Import for ESM Module
// =============================================================================

// We need to import the handler dynamically to properly mock dependencies
async function getHandler() {
  const module = await import("./login");
  return module.POST;
}

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a mock Supabase client with configurable auth responses
 */
function createMockSupabase(authResponse: {
  data?: { user: { id: string; email: string } | null };
  error?: { message: string; code?: string } | null;
}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(authResponse),
    },
  } as unknown as SupabaseClient;
}

/**
 * Creates a mock APIContext for Astro endpoints
 */
function createMockContext(
  body: unknown,
  supabase: SupabaseClient
): APIContext {
  return {
    request: {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as Request,
    locals: {
      supabase,
    },
    cookies: {} as APIContext["cookies"],
    params: {},
    url: new URL("http://localhost/api/auth/login"),
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

/**
 * Helper to parse JSON response
 */
async function parseResponse(response: Response) {
  return response.json();
}

// =============================================================================
// Tests
// =============================================================================

describe("/api/auth/login", () => {
  let POST: typeof import("./login").POST;

  beforeEach(async () => {
    vi.clearAllMocks();
    POST = await getHandler();
  });

  // =============================================================================
  // Zod Validation Tests
  // =============================================================================

  describe("zod validation", () => {
    describe("email validation", () => {
      it("should reject missing email field", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext({ password: "password123" }, supabase);

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it("should reject empty email", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext({ email: "", password: "password123" }, supabase);

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it("should reject invalid email format", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext(
          { email: "invalid-email", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("Nieprawidłowy format adresu email");
      });

      it("should reject email without @ symbol", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext(
          { email: "userexample.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("Nieprawidłowy format adresu email");
      });

      it("should reject email without domain", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext({ email: "user@", password: "password123" }, supabase);

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
      });

      it("should accept valid email format", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "user@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(200);
      });

      it("should accept email with subdomain", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user@mail.example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "user@mail.example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(200);
      });

      it("should accept email with plus sign", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user+tag@example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "user+tag@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(200);
      });
    });

    describe("password validation", () => {
      it("should reject missing password field", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext({ email: "user@example.com" }, supabase);

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBeDefined();
      });

      it("should reject empty password", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext({ email: "user@example.com", password: "" }, supabase);

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
      });

      it("should reject password shorter than 6 characters", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext(
          { email: "user@example.com", password: "12345" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("Hasło musi mieć co najmniej 6 znaków");
      });

      it("should accept password at minimum boundary (6 chars)", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "user@example.com", password: "123456" },
          supabase
        );

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(200);
      });

      it("should reject password at 5 characters (below boundary)", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = createMockContext(
          { email: "user@example.com", password: "12345" },
          supabase
        );

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(400);
      });

      it("should accept very long password", async () => {
        // Arrange
        const longPassword = "a".repeat(100);
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "user@example.com", password: longPassword },
          supabase
        );

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(200);
      });
    });

    describe("malformed input", () => {
      it("should handle non-object body gracefully", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = {
          ...createMockContext({}, supabase),
          request: {
            json: vi.fn().mockResolvedValue("not an object"),
          },
        } as unknown as APIContext;

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(400);
      });

      it("should handle null body", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = {
          ...createMockContext({}, supabase),
          request: {
            json: vi.fn().mockResolvedValue(null),
          },
        } as unknown as APIContext;

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(400);
      });

      it("should handle array body", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = {
          ...createMockContext({}, supabase),
          request: {
            json: vi.fn().mockResolvedValue([]),
          },
        } as unknown as APIContext;

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(400);
      });

      it("should ignore extra fields in request body", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        });
        const context = createMockContext(
          {
            email: "user@example.com",
            password: "password123",
            extraField: "should be ignored",
            anotherField: 12345,
          },
          supabase
        );

        // Act
        const response = await POST(context);

        // Assert
        expect(response.status).toBe(200);
        // Verify only email and password are passed to Supabase
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "user@example.com",
          password: "password123",
        });
      });
    });
  });

  // =============================================================================
  // Supabase Auth Integration Tests
  // =============================================================================

  describe("supabase auth integration", () => {
    describe("successful authentication", () => {
      it("should return user data on successful login", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "user@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(200);
        expect(data.user).toEqual({
          id: "user-123",
          email: "user@example.com",
        });
      });

      it("should return redirectTo on successful login", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "user@example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "user@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(data.redirectTo).toBe("/app");
      });

      it("should call supabase.auth.signInWithPassword with correct credentials", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: { id: "user-123", email: "test@example.com" } },
          error: null,
        });
        const context = createMockContext(
          { email: "test@example.com", password: "secretpass" },
          supabase
        );

        // Act
        await POST(context);

        // Assert
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
        expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "secretpass",
        });
      });
    });

    describe("authentication errors", () => {
      it("should return 401 on invalid credentials", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: null },
          error: { message: "Invalid login credentials" },
        });
        const context = createMockContext(
          { email: "user@example.com", password: "wrongpassword" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(401);
        expect(data.error).toBe("Nieprawidłowy email lub hasło");
      });

      it("should return generic error message for security (prevent user enumeration)", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: null },
          error: { message: "User not found" },
        });
        const context = createMockContext(
          { email: "nonexistent@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        // Should NOT reveal that user doesn't exist
        expect(data.error).toBe("Nieprawidłowy email lub hasło");
        expect(data.error).not.toContain("not found");
      });

      it("should handle EMAIL_NOT_CONFIRMED error specifically", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: null },
          error: { message: "Email not confirmed" },
        });
        const context = createMockContext(
          { email: "unconfirmed@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(400);
        expect(data.error).toBe("Adres email nie został potwierdzony. Sprawdź swoją skrzynkę.");
        expect(data.code).toBe("EMAIL_NOT_CONFIRMED");
      });

      it("should return code field for EMAIL_NOT_CONFIRMED error", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: null },
          error: { message: "Email not confirmed" },
        });
        const context = createMockContext(
          { email: "user@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(data.code).toBe("EMAIL_NOT_CONFIRMED");
      });

      it("should not return code field for other errors", async () => {
        // Arrange
        const supabase = createMockSupabase({
          data: { user: null },
          error: { message: "Invalid credentials" },
        });
        const context = createMockContext(
          { email: "user@example.com", password: "wrongpass" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(data.code).toBeUndefined();
      });
    });

    describe("server errors", () => {
      it("should return 500 on JSON parse error", async () => {
        // Arrange
        const supabase = createMockSupabase({ data: { user: null }, error: null });
        const context = {
          ...createMockContext({}, supabase),
          request: {
            json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
          },
        } as unknown as APIContext;

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe("Wystąpił błąd serwera. Spróbuj ponownie.");
      });

      it("should return 500 on unexpected Supabase error", async () => {
        // Arrange
        const supabase = {
          auth: {
            signInWithPassword: vi.fn().mockRejectedValue(new Error("Unexpected error")),
          },
        } as unknown as SupabaseClient;
        const context = createMockContext(
          { email: "user@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(response.status).toBe(500);
        expect(data.error).toBe("Wystąpił błąd serwera. Spróbuj ponownie.");
      });
    });
  });

  // =============================================================================
  // Response Format Tests
  // =============================================================================

  describe("response format", () => {
    it("should return JSON content type", async () => {
      // Arrange
      const supabase = createMockSupabase({
        data: { user: { id: "1", email: "test@test.com" } },
        error: null,
      });
      const context = createMockContext(
        { email: "test@test.com", password: "password123" },
        supabase
      );

      // Act
      const response = await POST(context);

      // Assert
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return JSON content type on validation error", async () => {
      // Arrange
      const supabase = createMockSupabase({ data: { user: null }, error: null });
      const context = createMockContext({ email: "invalid", password: "123" }, supabase);

      // Act
      const response = await POST(context);

      // Assert
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });

    it("should return JSON content type on auth error", async () => {
      // Arrange
      const supabase = createMockSupabase({
        data: { user: null },
        error: { message: "Invalid credentials" },
      });
      const context = createMockContext(
        { email: "user@example.com", password: "wrongpass" },
        supabase
      );

      // Act
      const response = await POST(context);

      // Assert
      expect(response.headers.get("Content-Type")).toBe("application/json");
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe("edge cases", () => {
    it("should reject unicode characters in email (Zod email validation)", async () => {
      // Arrange - unicode in local part is rejected by Zod's email() validator
      const supabase = createMockSupabase({
        data: { user: { id: "1", email: "użytkownik@example.com" } },
        error: null,
      });
      const context = createMockContext(
        { email: "użytkownik@example.com", password: "password123" },
        supabase
      );

      // Act
      const response = await POST(context);
      const data = await parseResponse(response);

      // Assert - Zod rejects unicode in email local part
      expect(response.status).toBe(400);
      expect(data.error).toBe("Nieprawidłowy format adresu email");
      expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("should handle unicode characters in password", async () => {
      // Arrange
      const supabase = createMockSupabase({
        data: { user: { id: "1", email: "user@example.com" } },
        error: null,
      });
      const context = createMockContext(
        { email: "user@example.com", password: "hasło123żółć" },
        supabase
      );

      // Act
      const response = await POST(context);

      // Assert
      expect(response.status).toBe(200);
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "hasło123żółć",
      });
    });

    it("should handle very long email address", async () => {
      // Arrange - email local part can be up to 64 chars, domain up to 255
      const longEmail = "a".repeat(60) + "@" + "b".repeat(60) + ".com";
      const supabase = createMockSupabase({
        data: { user: { id: "1", email: longEmail } },
        error: null,
      });
      const context = createMockContext({ email: longEmail, password: "password123" }, supabase);

      // Act
      const response = await POST(context);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should handle case sensitivity in email (preserve original case)", async () => {
      // Arrange
      const supabase = createMockSupabase({
        data: { user: { id: "1", email: "User@Example.COM" } },
        error: null,
      });
      const context = createMockContext(
        { email: "User@Example.COM", password: "password123" },
        supabase
      );

      // Act
      await POST(context);

      // Assert - email should be passed as-is (Supabase handles normalization)
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "User@Example.COM",
        password: "password123",
      });
    });

    it("should handle special characters in password", async () => {
      // Arrange
      const specialPassword = "p@$$w0rd!#$%^&*()_+-=[]{}|;':\",./<>?`~";
      const supabase = createMockSupabase({
        data: { user: { id: "1", email: "user@example.com" } },
        error: null,
      });
      const context = createMockContext(
        { email: "user@example.com", password: specialPassword },
        supabase
      );

      // Act
      const response = await POST(context);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should handle password with only spaces (length check)", async () => {
      // Arrange - 6 spaces should pass length validation
      const supabase = createMockSupabase({
        data: { user: { id: "1", email: "user@example.com" } },
        error: null,
      });
      const context = createMockContext(
        { email: "user@example.com", password: "      " },
        supabase
      );

      // Act
      const response = await POST(context);

      // Assert - Zod validates length, not content
      expect(response.status).toBe(200);
    });
  });

  // =============================================================================
  // Security Tests
  // =============================================================================

  describe("security", () => {
    it("should not expose internal error details in response", async () => {
      // Arrange
      const supabase = createMockSupabase({
        data: { user: null },
        error: { message: "Database connection failed: ECONNREFUSED 127.0.0.1:5432" },
      });
      const context = createMockContext(
        { email: "user@example.com", password: "password123" },
        supabase
      );

      // Act
      const response = await POST(context);
      const data = await parseResponse(response);

      // Assert - should not expose internal error details
      expect(data.error).toBe("Nieprawidłowy email lub hasło");
      expect(data.error).not.toContain("Database");
      expect(data.error).not.toContain("ECONNREFUSED");
    });

    it("should not expose whether email exists in system", async () => {
      // Arrange - different error messages should result in same user-facing error
      const errorMessages = [
        "User not found",
        "Invalid login credentials",
        "No user found with that email",
        "Password is incorrect",
      ];

      for (const errorMessage of errorMessages) {
        const supabase = createMockSupabase({
          data: { user: null },
          error: { message: errorMessage },
        });
        const context = createMockContext(
          { email: "user@example.com", password: "password123" },
          supabase
        );

        // Act
        const response = await POST(context);
        const data = await parseResponse(response);

        // Assert
        expect(data.error).toBe("Nieprawidłowy email lub hasło");
      }
    });

    it("should return first Zod validation error only (not all errors)", async () => {
      // Arrange
      const supabase = createMockSupabase({ data: { user: null }, error: null });
      const context = createMockContext({ email: "invalid", password: "123" }, supabase);

      // Act
      const response = await POST(context);
      const data = await parseResponse(response);

      // Assert - only first error returned
      expect(response.status).toBe(400);
      expect(typeof data.error).toBe("string");
      expect(Array.isArray(data.error)).toBe(false);
    });
  });
});
