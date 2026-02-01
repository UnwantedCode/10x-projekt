import { describe, it, expect } from "vitest";
import { updateProfileSchema, completeOnboardingSchema } from "./profile.schema";

describe("profile.schema", () => {
  // =============================================================================
  // updateProfileSchema
  // =============================================================================
  describe("updateProfileSchema", () => {
    describe("activeListId field", () => {
      it("should accept a valid UUID", () => {
        // Arrange
        const input = { activeListId: "550e8400-e29b-41d4-a716-446655440000" };

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.activeListId).toBe("550e8400-e29b-41d4-a716-446655440000");
        }
      });

      it("should accept null value (clearing active list)", () => {
        // Arrange
        const input = { activeListId: null };

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.activeListId).toBeNull();
        }
      });

      it("should reject invalid UUID format", () => {
        // Arrange
        const input = { activeListId: "not-a-valid-uuid" };

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Invalid UUID format");
        }
      });

      it("should reject empty string", () => {
        // Arrange
        const input = { activeListId: "" };

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject UUID with invalid characters", () => {
        // Arrange
        const input = { activeListId: "550e8400-e29b-41d4-a716-44665544ZZZZ" };

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject number instead of string", () => {
        // Arrange
        const input = { activeListId: 12345 };

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject undefined (field is required)", () => {
        // Arrange
        const input = {};

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe("extra fields handling", () => {
      it("should strip unknown fields", () => {
        // Arrange
        const input = {
          activeListId: "550e8400-e29b-41d4-a716-446655440000",
          unknownField: "should be stripped",
          anotherField: 123,
        };

        // Act
        const result = updateProfileSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            activeListId: "550e8400-e29b-41d4-a716-446655440000",
          });
          expect("unknownField" in result.data).toBe(false);
        }
      });
    });
  });

  // =============================================================================
  // completeOnboardingSchema
  // =============================================================================
  describe("completeOnboardingSchema", () => {
    describe("version field - valid values", () => {
      it("should accept minimum valid version (1)", () => {
        // Arrange
        const input = { version: 1 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.version).toBe(1);
        }
      });

      it("should accept maximum valid version (32767)", () => {
        // Arrange
        const input = { version: 32767 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.version).toBe(32767);
        }
      });

      it("should accept typical version number", () => {
        // Arrange
        const input = { version: 100 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
      });
    });

    describe("version field - boundary violations", () => {
      it("should reject version 0 (below minimum)", () => {
        // Arrange
        const input = { version: 0 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Version must be greater than 0");
        }
      });

      it("should reject negative version", () => {
        // Arrange
        const input = { version: -1 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Version must be greater than 0");
        }
      });

      it("should reject version exceeding maximum (32768)", () => {
        // Arrange
        const input = { version: 32768 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Version must be at most 32767");
        }
      });

      it("should reject very large version number", () => {
        // Arrange
        const input = { version: 999999 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe("version field - type validation", () => {
      it("should reject floating point number", () => {
        // Arrange
        const input = { version: 1.5 };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Version must be an integer");
        }
      });

      it("should reject string instead of number", () => {
        // Arrange
        const input = { version: "1" };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Version must be a number");
        }
      });

      it("should reject null", () => {
        // Arrange
        const input = { version: null };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject undefined (missing field)", () => {
        // Arrange
        const input = {};

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Version is required");
        }
      });

      it("should reject boolean", () => {
        // Arrange
        const input = { version: true };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject NaN", () => {
        // Arrange
        const input = { version: NaN };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });

      it("should reject Infinity", () => {
        // Arrange
        const input = { version: Infinity };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(false);
      });
    });

    describe("extra fields handling", () => {
      it("should strip unknown fields", () => {
        // Arrange
        const input = {
          version: 1,
          extraField: "should be ignored",
        };

        // Act
        const result = completeOnboardingSchema.safeParse(input);

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ version: 1 });
          expect("extraField" in result.data).toBe(false);
        }
      });
    });
  });
});
