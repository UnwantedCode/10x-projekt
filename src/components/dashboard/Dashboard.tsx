import { useCallback, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { toast } from "sonner";

import { Toaster } from "@/components/ui/sonner";
import { useDashboard } from "./hooks/useDashboard";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { OnboardingWizard } from "./OnboardingWizard";

// =============================================================================
// Supabase Client for Browser
// =============================================================================

const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

// =============================================================================
// Types
// =============================================================================

interface DashboardProps {
  userEmail: string;
}

// =============================================================================
// Component
// =============================================================================

export function Dashboard({ userEmail }: DashboardProps) {
  // Dashboard state and actions
  const {
    lists,
    activeList,
    activeListId,
    isLoadingLists,
    showOnboarding,
    error,
    setActiveList,
    createList,
    updateList,
    deleteList,
    completeOnboarding,
    clearError,
  } = useDashboard();

  // Show error toast when error changes
  useEffect(() => {
    if (error) {
      toast.error(error, {
        duration: 5000,
        action: {
          label: "Zamknij",
          onClick: () => clearError(),
        },
      });
    }
  }, [error, clearError]);

  // Handlers
  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, []);

  const handleSelectList = useCallback(
    async (listId: string) => {
      try {
        await setActiveList(listId);
      } catch {
        // Error handled by hook
      }
    },
    [setActiveList]
  );

  const handleCreateList = useCallback(
    async (name: string) => {
      try {
        await createList(name);
        toast.success("Lista została utworzona");
      } catch {
        // Error handled by hook
      }
    },
    [createList]
  );

  const handleUpdateList = useCallback(
    async (id: string, name: string) => {
      try {
        await updateList(id, name);
        toast.success("Lista została zaktualizowana");
      } catch {
        // Error handled by hook
      }
    },
    [updateList]
  );

  const handleDeleteList = useCallback(
    async (id: string) => {
      try {
        await deleteList(id);
        toast.success("Lista została usunięta");
      } catch {
        // Error handled by hook
      }
    },
    [deleteList]
  );

  const handleCompleteOnboarding = useCallback(async () => {
    await completeOnboarding();
  }, [completeOnboarding]);

  const handleStartCreateList = useCallback(() => {
    // This will be handled by focusing the sidebar create input
    // For now, just a placeholder
  }, []);

  return (
    <>
      {/* Toast container */}
      <Toaster position="top-right" richColors closeButton />

      <div className="flex h-screen flex-col">
        {/* Onboarding wizard overlay */}
        {showOnboarding && <OnboardingWizard onComplete={handleCompleteOnboarding} onSkip={handleCompleteOnboarding} />}

        {/* Header */}
        <header role="banner" className="border-b border-border bg-card">
          <Header userEmail={userEmail} onLogout={handleLogout} />
        </header>

        {/* Main layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            role="complementary"
            aria-label="Panel nawigacji list"
            className="w-64 flex-shrink-0 border-r border-border bg-card overflow-hidden"
          >
            <Sidebar
              lists={lists}
              activeListId={activeListId}
              onSelectList={handleSelectList}
              onCreateList={handleCreateList}
              onUpdateList={handleUpdateList}
              onDeleteList={handleDeleteList}
              isLoading={isLoadingLists}
            />
          </aside>

          {/* Main content */}
          <main
            role="main"
            id="main-content"
            aria-label="Zawartość główna - zadania"
            className="flex-1 overflow-hidden bg-background"
          >
            <MainContent
              activeList={activeList}
              showOnboarding={showOnboarding}
              onCompleteOnboarding={handleCompleteOnboarding}
              onStartCreateList={handleStartCreateList}
            />
          </main>
        </div>
      </div>
    </>
  );
}
