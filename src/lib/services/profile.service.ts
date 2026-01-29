import type { SupabaseClient } from "@/db/supabase.client";
import type { Database } from "@/db/database.types";
import type { ProfileDTO, UpdateProfileCommand, CompleteOnboardingCommand } from "@/types";

type ProfileEntity = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Result type for profile read operations
 */
type ProfileResult =
  | { success: true; data: ProfileDTO }
  | { success: false; error: "not_found" | "database_error"; message: string };

/**
 * Result type for profile update operations
 */
type UpdateProfileResult =
  | { success: true; data: ProfileDTO }
  | { success: false; error: "invalid_list" | "database_error"; message: string };

/**
 * Maps a database ProfileEntity to a ProfileDTO
 * Converts snake_case fields to camelCase
 */
function mapProfileEntityToDTO(entity: ProfileEntity): ProfileDTO {
  return {
    id: entity.id,
    activeListId: entity.active_list_id,
    onboardingCompletedAt: entity.onboarding_completed_at,
    onboardingVersion: entity.onboarding_version,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

/**
 * Fetches the profile for a given user ID
 *
 * @param supabase - Supabase client instance
 * @param userId - UUID of the user whose profile to fetch
 * @returns ProfileResult with either the profile data or an error
 */
export async function getProfile(supabase: SupabaseClient, userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    // PGRST116 = "JSON object requested, multiple (or no) rows returned"
    if (error.code === "PGRST116") {
      return { success: false, error: "not_found", message: "Profile not found" };
    }
    console.error("Database error fetching profile:", error);
    return { success: false, error: "database_error", message: "Unable to fetch profile" };
  }

  return { success: true, data: mapProfileEntityToDTO(data) };
}

/**
 * Updates the profile for a given user ID
 *
 * @param supabase - Supabase client instance
 * @param userId - UUID of the user whose profile to update
 * @param command - Update command with fields to change
 * @returns UpdateProfileResult with either the updated profile data or an error
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  command: UpdateProfileCommand
): Promise<UpdateProfileResult> {
  // 1. If activeListId is not null, verify the list exists and belongs to the user
  if (command.activeListId !== null) {
    const { data: list, error: listError } = await supabase
      .from("lists")
      .select("id")
      .eq("id", command.activeListId)
      .eq("user_id", userId)
      .single();

    if (listError || !list) {
      return {
        success: false,
        error: "invalid_list",
        message: "List not found or doesn't belong to user",
      };
    }
  }

  // 2. Update the profile
  const { data, error } = await supabase
    .from("profiles")
    .update({ active_list_id: command.activeListId })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    // FK constraint violation (23503) - list doesn't exist or doesn't belong to user
    if (error.code === "23503") {
      return {
        success: false,
        error: "invalid_list",
        message: "List not found or doesn't belong to user",
      };
    }
    console.error("Database error updating profile:", error);
    return { success: false, error: "database_error", message: "Unable to update profile" };
  }

  return { success: true, data: mapProfileEntityToDTO(data) };
}

/**
 * Marks onboarding as complete for a given user
 *
 * @param supabase - Supabase client instance
 * @param userId - UUID of the user whose onboarding to complete
 * @param command - Command with onboarding version
 * @returns ProfileResult with either the updated profile data or an error
 */
export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string,
  command: CompleteOnboardingCommand
): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      onboarding_version: command.version,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    // PGRST116 = "JSON object requested, multiple (or no) rows returned"
    if (error.code === "PGRST116") {
      return { success: false, error: "not_found", message: "Profile not found" };
    }
    console.error("Database error completing onboarding:", error);
    return { success: false, error: "database_error", message: "Unable to update profile" };
  }

  return { success: true, data: mapProfileEntityToDTO(data) };
}
