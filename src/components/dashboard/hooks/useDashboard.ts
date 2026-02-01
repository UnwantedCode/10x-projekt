import { useState, useEffect, useCallback, useMemo } from "react";

import type { ProfileDTO, ListDTO } from "@/types";

import {
  fetchProfile,
  fetchLists,
  updateActiveList,
  createList as apiCreateList,
  updateList as apiUpdateList,
  deleteList as apiDeleteList,
  completeOnboarding as apiCompleteOnboarding,
} from "@/lib/api/dashboard.api";

import { isUnauthorizedError, handleUnauthorizedError, getErrorMessage } from "@/lib/api/errors";

import { CURRENT_ONBOARDING_VERSION } from "../types";

// =============================================================================
// Types
// =============================================================================

export interface UseDashboardReturn {
  // State
  profile: ProfileDTO | null;
  lists: ListDTO[];
  activeList: ListDTO | null;
  activeListId: string | null;
  isLoadingProfile: boolean;
  isLoadingLists: boolean;
  error: string | null;
  showOnboarding: boolean;

  // Actions
  setActiveList: (listId: string | null) => Promise<void>;
  createList: (name: string) => Promise<ListDTO>;
  updateList: (id: string, name: string) => Promise<ListDTO>;
  deleteList: (id: string) => Promise<void>;
  refreshLists: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  clearError: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useDashboard(): UseDashboardReturn {
  // State
  const [profile, setProfile] = useState<ProfileDTO | null>(null);
  const [lists, setLists] = useState<ListDTO[]>([]);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoadingLists, setIsLoadingLists] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived state
  const activeListId = profile?.activeListId ?? null;

  const activeList = useMemo(() => {
    if (!activeListId) return null;
    return lists.find((list) => list.id === activeListId) ?? null;
  }, [activeListId, lists]);

  const showOnboarding = useMemo(() => {
    return profile !== null && profile.onboardingCompletedAt === null;
  }, [profile]);

  // =============================================================================
  // Error Handling
  // =============================================================================

  const handleError = useCallback((err: unknown) => {
    if (isUnauthorizedError(err)) {
      handleUnauthorizedError();
      return;
    }
    setError(getErrorMessage(err));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // =============================================================================
  // Data Fetching
  // =============================================================================

  // Fetch profile on mount
  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const data = await fetchProfile();
        if (mounted) {
          setProfile(data);
        }
      } catch (err) {
        if (mounted) {
          handleError(err);
        }
      } finally {
        if (mounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [handleError]);

  // Fetch lists on mount
  useEffect(() => {
    let mounted = true;

    async function loadLists() {
      try {
        const response = await fetchLists();
        if (mounted) {
          setLists(response.data);
        }
      } catch (err) {
        if (mounted) {
          handleError(err);
        }
      } finally {
        if (mounted) {
          setIsLoadingLists(false);
        }
      }
    }

    loadLists();

    return () => {
      mounted = false;
    };
  }, [handleError]);

  // =============================================================================
  // Actions
  // =============================================================================

  const setActiveListAction = useCallback(
    async (listId: string | null) => {
      // Optimistic update
      const previousProfile = profile;
      if (profile) {
        setProfile({ ...profile, activeListId: listId });
      }

      try {
        const updatedProfile = await updateActiveList(listId);
        setProfile(updatedProfile);
        setError(null);
      } catch (err) {
        // Rollback on error
        setProfile(previousProfile);
        handleError(err);
        throw err;
      }
    },
    [profile, handleError]
  );

  const createListAction = useCallback(
    async (name: string): Promise<ListDTO> => {
      try {
        const newList = await apiCreateList({ name });

        // Add new list to state
        setLists((prev) => [...prev, newList]);

        // Set as active list
        await setActiveListAction(newList.id);

        setError(null);
        return newList;
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    [handleError, setActiveListAction]
  );

  const updateListAction = useCallback(
    async (id: string, name: string): Promise<ListDTO> => {
      // Optimistic update
      const previousLists = lists;
      setLists((prev) => prev.map((list) => (list.id === id ? { ...list, name } : list)));

      try {
        const updatedList = await apiUpdateList(id, { name });

        // Update with server response
        setLists((prev) => prev.map((list) => (list.id === id ? updatedList : list)));

        setError(null);
        return updatedList;
      } catch (err) {
        // Rollback on error
        setLists(previousLists);
        handleError(err);
        throw err;
      }
    },
    [lists, handleError]
  );

  const deleteListAction = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update
      const previousLists = lists;
      const previousProfile = profile;

      setLists((prev) => prev.filter((list) => list.id !== id));

      // If deleting active list, clear active list or set to another
      if (activeListId === id) {
        const remainingLists = lists.filter((list) => list.id !== id);
        const newActiveId = remainingLists.length > 0 ? remainingLists[0].id : null;

        if (profile) {
          setProfile({ ...profile, activeListId: newActiveId });
        }
      }

      try {
        await apiDeleteList(id);

        // Update active list on server if it was the deleted one
        if (activeListId === id) {
          const remainingLists = previousLists.filter((list) => list.id !== id);
          const newActiveId = remainingLists.length > 0 ? remainingLists[0].id : null;
          await updateActiveList(newActiveId);
        }

        setError(null);
      } catch (err) {
        // Rollback on error
        setLists(previousLists);
        setProfile(previousProfile);
        handleError(err);
        throw err;
      }
    },
    [lists, profile, activeListId, handleError]
  );

  const refreshListsAction = useCallback(async (): Promise<void> => {
    setIsLoadingLists(true);
    try {
      const response = await fetchLists();
      setLists(response.data);
      setError(null);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoadingLists(false);
    }
  }, [handleError]);

  const completeOnboardingAction = useCallback(async (): Promise<void> => {
    try {
      const updatedProfile = await apiCompleteOnboarding(CURRENT_ONBOARDING_VERSION);
      setProfile(updatedProfile);
      setError(null);
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, [handleError]);

  // =============================================================================
  // Return
  // =============================================================================

  return {
    // State
    profile,
    lists,
    activeList,
    activeListId,
    isLoadingProfile,
    isLoadingLists,
    error,
    showOnboarding,

    // Actions
    setActiveList: setActiveListAction,
    createList: createListAction,
    updateList: updateListAction,
    deleteList: deleteListAction,
    refreshLists: refreshListsAction,
    completeOnboarding: completeOnboardingAction,
    clearError,
  };
}
