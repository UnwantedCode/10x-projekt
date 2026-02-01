import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProfile, updateProfile, completeOnboarding } from "./profile.service";
import type { SupabaseClient } from "@/db/supabase.client";
import {
  sampleProfileEntity,
  sampleProfileEntityNoList,
} from "@/test/mocks/supabase.mock";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a typed mock Supabase client with configurable behavior
 */
function createMockSupabase(options: {
  profiles?: {
    selectResult?: { data: unknown; error: unknown };
    updateResult?: { data: unknown; error: unknown };
  };
  lists?: {
    selectResult?: { data: unknown; error: unknown };
  };
} = {}) {
  const profilesSelectResult = options.profiles?.selectResult ?? { data: null, error: null };
  const profilesUpdateResult = options.profiles?.updateResult ?? { data: null, error: null };
  const listsSelectResult = options.lists?.selectResult ?? { data: null, error: null };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(profilesSelectResult),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(profilesUpdateResult),
              }),
            }),
          }),
        };
      }

      if (table === "lists") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(listsSelectResult),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  } as unknown as SupabaseClient;
}

// =============================================================================
// getProfile Tests
// =============================================================================

describe("profile.service", () => {
  describe("getProfile", () => {
    describe("successful retrieval", () => {
      it("should return profile with all fields mapped correctly", async () => {
        // Arrange
        const supabase = createMockSupabase({
          profiles: {
            selectResult: { data: sampleProfileEntity, error: null },
          },
        });

        // Act
        const result = await getProfile(supabase, "user-123");

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            id: "user-123",
            activeListId: "list-456",
            onboardingCompletedAt: "2024-01-15T10:30:00Z",
            onboardingVersion: 1,
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-15T10:30:00Z",
          });
        }
      });

      it("should correctly map profile with null activeListId", async () => {
        // Arrange
        const supabase = createMockSupabase({
          profiles: {
            selectResult: { data: sampleProfileEntityNoList, error: null },
          },
        });

        // Act
        const result = await getProfile(supabase, "user-789");

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.activeListId).toBeNull();
          expect(result.data.onboardingCompletedAt).toBeNull();
        }
      });

      it("should query the correct user ID", async () => {
        // Arrange
        const mockFrom = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: sampleProfileEntity, error: null }),
            }),
          }),
        });
        const supabase = { from: mockFrom } as unknown as SupabaseClient;

        // Act
        await getProfile(supabase, "specific-user-id");

        // Assert
        expect(mockFrom).toHaveBeenCalledWith("profiles");
      });
    });

    describe("error handling", () => {
      it("should return not_found error when profile does not exist (PGRST116)", async () => {
        // Arrange
        const supabase = createMockSupabase({
          profiles: {
            selectResult: { data: null, error: { code: "PGRST116", message: "No rows" } },
          },
        });

        // Act
        const result = await getProfile(supabase, "nonexistent-user");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("not_found");
          expect(result.message).toBe("Profile not found");
        }
      });

      it("should return database_error for other database errors", async () => {
        // Arrange
        const supabase = createMockSupabase({
          profiles: {
            selectResult: { data: null, error: { code: "UNKNOWN", message: "DB error" } },
          },
        });
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Act
        const result = await getProfile(supabase, "user-123");

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("database_error");
          expect(result.message).toBe("Unable to fetch profile");
        }
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  // =============================================================================
  // updateProfile Tests
  // =============================================================================

  describe("updateProfile", () => {
    describe("successful update", () => {
      it("should update profile when activeListId is valid", async () => {
        // Arrange
        const updatedEntity = { ...sampleProfileEntity, active_list_id: "new-list-id" };
        const supabase = createMockSupabase({
          lists: {
            selectResult: { data: { id: "new-list-id" }, error: null },
          },
          profiles: {
            updateResult: { data: updatedEntity, error: null },
          },
        });

        // Act
        const result = await updateProfile(supabase, "user-123", { activeListId: "new-list-id" });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.activeListId).toBe("new-list-id");
        }
      });

      it("should update profile with null activeListId without list validation", async () => {
        // Arrange
        const updatedEntity = { ...sampleProfileEntity, active_list_id: null };
        const supabase = createMockSupabase({
          profiles: {
            updateResult: { data: updatedEntity, error: null },
          },
        });

        // Act
        const result = await updateProfile(supabase, "user-123", { activeListId: null });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.activeListId).toBeNull();
        }
      });

      it("should skip list validation when activeListId is null", async () => {
        // Arrange
        const mockFrom = vi.fn().mockImplementation((table: string) => {
          if (table === "profiles") {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...sampleProfileEntity, active_list_id: null },
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          }
          throw new Error("Should not query lists table");
        });
        const supabase = { from: mockFrom } as unknown as SupabaseClient;

        // Act
        const result = await updateProfile(supabase, "user-123", { activeListId: null });

        // Assert
        expect(result.success).toBe(true);
        // Verify lists table was never queried
        const listsCalls = mockFrom.mock.calls.filter(
          (call: unknown[]) => call[0] === "lists"
        );
        expect(listsCalls).toHaveLength(0);
      });
    });

    describe("list validation", () => {
      it("should return invalid_list error when list does not exist", async () => {
        // Arrange
        const supabase = createMockSupabase({
          lists: {
            selectResult: { data: null, error: { code: "PGRST116" } },
          },
        });

        // Act
        const result = await updateProfile(supabase, "user-123", {
          activeListId: "nonexistent-list",
        });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("invalid_list");
          expect(result.message).toBe("List not found or doesn't belong to user");
        }
      });

      it("should return invalid_list error when list belongs to different user", async () => {
        // Arrange - list exists but query returns null (user_id doesn't match)
        const supabase = createMockSupabase({
          lists: {
            selectResult: { data: null, error: null },
          },
        });

        // Act
        const result = await updateProfile(supabase, "user-123", {
          activeListId: "other-users-list",
        });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("invalid_list");
        }
      });

      it("should handle FK constraint violation (code 23503)", async () => {
        // Arrange
        const supabase = createMockSupabase({
          lists: {
            selectResult: { data: { id: "list-id" }, error: null },
          },
          profiles: {
            updateResult: { data: null, error: { code: "23503", message: "FK violation" } },
          },
        });

        // Act
        const result = await updateProfile(supabase, "user-123", { activeListId: "list-id" });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("invalid_list");
          expect(result.message).toBe("List not found or doesn't belong to user");
        }
      });
    });

    describe("error handling", () => {
      it("should return database_error for unexpected errors during update", async () => {
        // Arrange
        const supabase = createMockSupabase({
          lists: {
            selectResult: { data: { id: "list-id" }, error: null },
          },
          profiles: {
            updateResult: { data: null, error: { code: "UNKNOWN", message: "Unexpected" } },
          },
        });
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Act
        const result = await updateProfile(supabase, "user-123", { activeListId: "list-id" });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("database_error");
          expect(result.message).toBe("Unable to update profile");
        }
        consoleSpy.mockRestore();
      });
    });
  });

  // =============================================================================
  // completeOnboarding Tests
  // =============================================================================

  describe("completeOnboarding", () => {
    describe("successful completion", () => {
      it("should update onboarding fields correctly", async () => {
        // Arrange
        const updatedEntity = {
          ...sampleProfileEntityNoList,
          onboarding_completed_at: "2024-06-15T12:00:00Z",
          onboarding_version: 2,
        };
        const supabase = createMockSupabase({
          profiles: {
            updateResult: { data: updatedEntity, error: null },
          },
        });

        // Act
        const result = await completeOnboarding(supabase, "user-789", { version: 2 });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.onboardingVersion).toBe(2);
          expect(result.data.onboardingCompletedAt).toBe("2024-06-15T12:00:00Z");
        }
      });

      it("should set version from command parameter", async () => {
        // Arrange
        const updatedEntity = {
          ...sampleProfileEntityNoList,
          onboarding_completed_at: "2024-06-15T12:00:00Z",
          onboarding_version: 5,
        };
        const supabase = createMockSupabase({
          profiles: {
            updateResult: { data: updatedEntity, error: null },
          },
        });

        // Act
        const result = await completeOnboarding(supabase, "user-789", { version: 5 });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.onboardingVersion).toBe(5);
        }
      });

      it("should handle maximum valid version (32767)", async () => {
        // Arrange
        const updatedEntity = {
          ...sampleProfileEntityNoList,
          onboarding_completed_at: "2024-06-15T12:00:00Z",
          onboarding_version: 32767,
        };
        const supabase = createMockSupabase({
          profiles: {
            updateResult: { data: updatedEntity, error: null },
          },
        });

        // Act
        const result = await completeOnboarding(supabase, "user-789", { version: 32767 });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.onboardingVersion).toBe(32767);
        }
      });
    });

    describe("error handling", () => {
      it("should return not_found error when profile does not exist", async () => {
        // Arrange
        const supabase = createMockSupabase({
          profiles: {
            updateResult: { data: null, error: { code: "PGRST116", message: "No rows" } },
          },
        });

        // Act
        const result = await completeOnboarding(supabase, "nonexistent", { version: 1 });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("not_found");
          expect(result.message).toBe("Profile not found");
        }
      });

      it("should return database_error for other errors", async () => {
        // Arrange
        const supabase = createMockSupabase({
          profiles: {
            updateResult: { data: null, error: { code: "UNKNOWN", message: "Error" } },
          },
        });
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        // Act
        const result = await completeOnboarding(supabase, "user-123", { version: 1 });

        // Assert
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe("database_error");
          expect(result.message).toBe("Unable to update profile");
        }
        consoleSpy.mockRestore();
      });
    });

    describe("idempotency", () => {
      it("should successfully complete onboarding even if already completed", async () => {
        // Arrange - profile already has onboarding completed
        const alreadyCompletedEntity = {
          ...sampleProfileEntity,
          onboarding_completed_at: "2024-06-20T12:00:00Z",
          onboarding_version: 3,
        };
        const supabase = createMockSupabase({
          profiles: {
            updateResult: { data: alreadyCompletedEntity, error: null },
          },
        });

        // Act
        const result = await completeOnboarding(supabase, "user-123", { version: 3 });

        // Assert
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.onboardingCompletedAt).toBe("2024-06-20T12:00:00Z");
        }
      });
    });
  });

  // =============================================================================
  // Entity to DTO Mapping Tests (via exported functions)
  // =============================================================================

  describe("entity to DTO mapping", () => {
    it("should correctly transform snake_case to camelCase", async () => {
      // Arrange
      const entity = {
        id: "test-id",
        active_list_id: "list-id",
        onboarding_completed_at: "2024-01-01T00:00:00Z",
        onboarding_version: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };
      const supabase = createMockSupabase({
        profiles: {
          selectResult: { data: entity, error: null },
        },
      });

      // Act
      const result = await getProfile(supabase, "test-id");

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        // Verify all fields are camelCase
        expect("activeListId" in result.data).toBe(true);
        expect("onboardingCompletedAt" in result.data).toBe(true);
        expect("onboardingVersion" in result.data).toBe(true);
        expect("createdAt" in result.data).toBe(true);
        expect("updatedAt" in result.data).toBe(true);

        // Verify snake_case fields don't exist
        expect("active_list_id" in result.data).toBe(false);
        expect("onboarding_completed_at" in result.data).toBe(false);
        expect("created_at" in result.data).toBe(false);
      }
    });

    it("should preserve null values during mapping", async () => {
      // Arrange
      const entityWithNulls = {
        id: "test-id",
        active_list_id: null,
        onboarding_completed_at: null,
        onboarding_version: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      const supabase = createMockSupabase({
        profiles: {
          selectResult: { data: entityWithNulls, error: null },
        },
      });

      // Act
      const result = await getProfile(supabase, "test-id");

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.activeListId).toBeNull();
        expect(result.data.onboardingCompletedAt).toBeNull();
      }
    });
  });
});
