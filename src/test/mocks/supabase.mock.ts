import { vi } from "vitest";
import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Creates a mock Supabase client for testing
 * Supports chained method calls like: supabase.from().select().eq().single()
 */
export function createMockSupabaseClient(overrides?: {
  selectResult?: { data: unknown; error: unknown };
  updateResult?: { data: unknown; error: unknown };
}): SupabaseClient {
  const defaultSelectResult = { data: null, error: null };
  const defaultUpdateResult = { data: null, error: null };

  const selectResult = overrides?.selectResult ?? defaultSelectResult;
  const updateResult = overrides?.updateResult ?? defaultUpdateResult;

  // Create chainable mock that returns itself until terminal method
  const createChainableMock = (terminalResult: { data: unknown; error: unknown }) => {
    const chainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(terminalResult),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    };
    return chainable;
  };

  const fromMock = vi.fn().mockImplementation((table: string) => {
    // Return different chainable based on expected operation
    const chainable = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(selectResult),
          }),
          single: vi.fn().mockResolvedValue(selectResult),
        }),
        single: vi.fn().mockResolvedValue(selectResult),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(updateResult),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(updateResult),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };
    return chainable;
  });

  return {
    from: fromMock,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
  } as unknown as SupabaseClient;
}

/**
 * Creates a mock Supabase client with configurable responses for profile operations
 */
export function createProfileMockSupabase(config: {
  getProfileResult?: { data: unknown; error: unknown };
  listCheckResult?: { data: unknown; error: unknown };
  updateProfileResult?: { data: unknown; error: unknown };
}) {
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(
              config.getProfileResult ?? { data: null, error: { code: "PGRST116" } }
            ),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue(
                config.updateProfileResult ?? { data: null, error: null }
              ),
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
              single: vi.fn().mockResolvedValue(
                config.listCheckResult ?? { data: null, error: { code: "PGRST116" } }
              ),
            }),
          }),
        }),
      };
    }

    return createMockSupabaseClient().from(table);
  });

  return {
    from: fromMock,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  } as unknown as SupabaseClient;
}

/**
 * Sample profile entity for testing
 */
export const sampleProfileEntity = {
  id: "user-123",
  active_list_id: "list-456",
  onboarding_completed_at: "2024-01-15T10:30:00Z",
  onboarding_version: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-15T10:30:00Z",
};

/**
 * Sample profile entity without active list
 */
export const sampleProfileEntityNoList = {
  id: "user-789",
  active_list_id: null,
  onboarding_completed_at: null,
  onboarding_version: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};
