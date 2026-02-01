import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLoginForm } from "./useLoginForm";

// =============================================================================
// Test Setup
// =============================================================================

// Mock fetch globally
const mockFetch = vi.fn();

// Store original values
const originalFetch = globalThis.fetch;
const originalLocation = window.location;

describe("useLoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock fetch
    globalThis.fetch = mockFetch;

    // Mock window.location with writable href
    Object.defineProperty(window, "location", {
      value: {
        href: "",
        search: "",
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    globalThis.fetch = originalFetch;
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  // =============================================================================
  // Initial State Tests
  // =============================================================================

  describe("initial state", () => {
    it("should initialize with empty form values", () => {
      // Arrange & Act
      const { result } = renderHook(() => useLoginForm());

      // Assert
      expect(result.current.values).toEqual({
        email: "",
        password: "",
      });
    });

    it("should initialize with no errors", () => {
      // Arrange & Act
      const { result } = renderHook(() => useLoginForm());

      // Assert
      expect(result.current.errors).toEqual({});
    });

    it("should initialize with isSubmitting as false", () => {
      // Arrange & Act
      const { result } = renderHook(() => useLoginForm());

      // Assert
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should return all required handler functions", () => {
      // Arrange & Act
      const { result } = renderHook(() => useLoginForm());

      // Assert
      expect(typeof result.current.handleChange).toBe("function");
      expect(typeof result.current.handleBlur).toBe("function");
      expect(typeof result.current.handleSubmit).toBe("function");
    });
  });

  // =============================================================================
  // Email Validation Tests
  // =============================================================================

  describe("email validation", () => {
    it("should accept valid email format", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "user@example.com" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBeUndefined();
    });

    it("should reject empty email", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Adres email jest wymagany");
    });

    it("should reject whitespace-only email", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "   " },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Adres email jest wymagany");
    });

    it("should reject email without @ symbol", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "userexample.com" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Nieprawidłowy format adresu email");
    });

    it("should reject email without domain", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "user@" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Nieprawidłowy format adresu email");
    });

    it("should reject email without TLD", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "user@example" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Nieprawidłowy format adresu email");
    });

    it("should reject email with spaces", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "user @example.com" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Nieprawidłowy format adresu email");
    });

    it("should accept email with subdomain", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "user@mail.example.com" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBeUndefined();
    });

    it("should accept email with plus sign", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "user+tag@example.com" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  // =============================================================================
  // Password Validation Tests
  // =============================================================================

  describe("password validation", () => {
    it("should accept password with 6 or more characters", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "password", value: "123456" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.password).toBeUndefined();
    });

    it("should reject empty password", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "password", value: "" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.password).toBe("Hasło jest wymagane");
    });

    it("should reject password shorter than 6 characters", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "password", value: "12345" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.password).toBe("Hasło musi mieć co najmniej 6 znaków");
    });

    it("should accept password at minimum boundary (6 chars)", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "password", value: "abcdef" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.password).toBeUndefined();
    });

    it("should reject password just below minimum boundary (5 chars)", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "password", value: "abcde" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.password).toBe("Hasło musi mieć co najmniej 6 znaków");
    });

    it("should accept very long password", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      const longPassword = "a".repeat(100);

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "password", value: longPassword },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.password).toBeUndefined();
    });
  });

  // =============================================================================
  // handleChange Tests
  // =============================================================================

  describe("handleChange", () => {
    it("should update email value", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "test@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.values.email).toBe("test@example.com");
    });

    it("should update password value", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleChange({
          target: { name: "password", value: "secret123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.values.password).toBe("secret123");
    });

    it("should not validate on change for untouched field", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "invalid" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert - no error shown because field not touched yet
      expect(result.current.errors.email).toBeUndefined();
    });

    it("should validate on change for touched field", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Touch the field first
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "test@example.com" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Act - change to invalid value
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "invalid" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Nieprawidłowy format adresu email");
    });

    it("should clear form error on input change", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Simulate a form error by touching and validating
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Act - change the value
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "a" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert - form error should be cleared
      expect(result.current.errors.form).toBeUndefined();
      expect(result.current.errors.emailNotConfirmed).toBeUndefined();
    });
  });

  // =============================================================================
  // handleBlur Tests
  // =============================================================================

  describe("handleBlur", () => {
    it("should mark field as touched", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act - blur on email
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Subsequent change should validate
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "invalid" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert - validation happens because field is touched
      expect(result.current.errors.email).toBeDefined();
    });

    it("should validate email on blur", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "invalid-email" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBe("Nieprawidłowy format adresu email");
    });

    it("should validate password on blur", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleBlur({
          target: { name: "password", value: "123" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.password).toBe("Hasło musi mieć co najmniej 6 znaków");
    });

    it("should clear error on valid value after blur", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // First blur with invalid value
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "invalid" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      expect(result.current.errors.email).toBeDefined();

      // Act - blur again with valid value
      act(() => {
        result.current.handleBlur({
          target: { name: "email", value: "valid@example.com" },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  // =============================================================================
  // handleSubmit Tests - Validation
  // =============================================================================

  describe("handleSubmit - validation", () => {
    it("should not submit with empty form", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      const preventDefault = vi.fn();

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault,
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(preventDefault).toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.errors.email).toBe("Adres email jest wymagany");
      expect(result.current.errors.password).toBe("Hasło jest wymagane");
    });

    it("should not submit with invalid email", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Set values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "invalid" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.errors.email).toBeDefined();
    });

    it("should not submit with password too short", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Set values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "12345" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.errors.password).toBeDefined();
    });

    it("should focus first field with error on validation failure", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      const focusMock = vi.fn();
      const querySelectorSpy = vi.spyOn(document, "querySelector").mockReturnValue({
        focus: focusMock,
      } as unknown as Element);

      // Set only password (email is empty)
      act(() => {
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(querySelectorSpy).toHaveBeenCalledWith('input[name="email"]');
      expect(focusMock).toHaveBeenCalled();
      querySelectorSpy.mockRestore();
    });

    it("should focus password field when email is valid but password has error", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      const focusMock = vi.fn();
      const querySelectorSpy = vi.spyOn(document, "querySelector").mockReturnValue({
        focus: focusMock,
      } as unknown as Element);

      // Set valid email, invalid password
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(querySelectorSpy).toHaveBeenCalledWith('input[name="password"]');
      querySelectorSpy.mockRestore();
    });
  });

  // =============================================================================
  // handleSubmit Tests - API Call
  // =============================================================================

  describe("handleSubmit - API call", () => {
    it("should call API with correct data on valid form", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "1" }, redirectTo: "/app" }),
      });

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(mockFetch).toHaveBeenCalledWith("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
        }),
      });
    });

    it("should set isSubmitting to false after successful API call", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "1" }, redirectTo: "/app" }),
      });

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Verify initial state
      expect(result.current.isSubmitting).toBe(false);

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert - isSubmitting should be false after completion
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should redirect to /app on successful login", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "1" }, redirectTo: "/app" }),
      });

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(window.location.href).toBe("/app");
    });

    it("should use redirectTo from URL params if present", async () => {
      // Arrange
      window.location.search = "?redirectTo=/dashboard";
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "1" }, redirectTo: "/app" }),
      });

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(window.location.href).toBe("/dashboard");
    });
  });

  // =============================================================================
  // handleSubmit Tests - Error Handling
  // =============================================================================

  describe("handleSubmit - error handling", () => {
    it("should display form error on invalid credentials", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Nieprawidłowy email lub hasło" }),
      });

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "wrongpassword" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(result.current.errors.form).toBe("Nieprawidłowy email lub hasło");
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should set emailNotConfirmed flag on EMAIL_NOT_CONFIRMED error", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "Email nie został potwierdzony",
          code: "EMAIL_NOT_CONFIRMED",
        }),
      });

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "unconfirmed@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(result.current.errors.emailNotConfirmed).toBe(true);
      expect(result.current.errors.form).toBe("Email nie został potwierdzony");
    });

    it("should handle network error gracefully", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(result.current.errors.form).toBe("Błąd połączenia z serwerem. Spróbuj ponownie.");
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should reset isSubmitting after error", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Error" }),
      });

      // Set valid values
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(result.current.isSubmitting).toBe(false);
    });

    it("should clear previous errors before new submission", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // First failed submission
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "First error" }),
      });

      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "password", value: "password123" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      expect(result.current.errors.form).toBe("First error");

      // Second submission - success
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: "1" }, redirectTo: "/app" }),
      });

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert - previous error should be cleared
      expect(result.current.errors.form).toBeUndefined();
    });
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  describe("edge cases", () => {
    it("should reject email with leading/trailing spaces (regex does not allow spaces)", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "  user@example.com  " },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleBlur({
          target: { name: "email", value: "  user@example.com  " },
        } as React.FocusEvent<HTMLInputElement>);
      });

      // Assert - email with spaces is invalid per regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      expect(result.current.values.email).toBe("  user@example.com  ");
      expect(result.current.errors.email).toBe("Nieprawidłowy format adresu email");
    });

    it("should accept email after user trims whitespace", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // First enter with spaces
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "  user@example.com  " },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleBlur({
          target: { name: "email", value: "  user@example.com  " },
        } as React.FocusEvent<HTMLInputElement>);
      });

      expect(result.current.errors.email).toBeDefined();

      // Then user corrects by trimming
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert - validation clears when value is corrected
      expect(result.current.values.email).toBe("user@example.com");
      expect(result.current.errors.email).toBeUndefined();
    });

    it("should handle rapid consecutive changes", () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());

      // Act - rapid changes
      act(() => {
        result.current.handleChange({
          target: { name: "email", value: "a" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "email", value: "ab" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "email", value: "abc" },
        } as React.ChangeEvent<HTMLInputElement>);
        result.current.handleChange({
          target: { name: "email", value: "user@example.com" },
        } as React.ChangeEvent<HTMLInputElement>);
      });

      // Assert
      expect(result.current.values.email).toBe("user@example.com");
    });

    it("should handle null querySelector result", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      const querySelectorSpy = vi.spyOn(document, "querySelector").mockReturnValue(null);

      // Act - should not throw
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault: vi.fn(),
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert - no error thrown, validation errors present
      expect(result.current.errors.email).toBeDefined();
      querySelectorSpy.mockRestore();
    });

    it("should prevent default form submission", async () => {
      // Arrange
      const { result } = renderHook(() => useLoginForm());
      const preventDefault = vi.fn();

      // Act
      await act(async () => {
        await result.current.handleSubmit({
          preventDefault,
        } as unknown as React.FormEvent<HTMLFormElement>);
      });

      // Assert
      expect(preventDefault).toHaveBeenCalledTimes(1);
    });
  });
});
