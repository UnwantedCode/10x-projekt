import { useState, useCallback, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ListDTO } from "@/types";

import { ListItem } from "./ListItem";
import { EmptyState } from "./EmptyState";

// =============================================================================
// Types
// =============================================================================

interface SidebarProps {
  lists: ListDTO[];
  activeListId: string | null;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string) => Promise<void>;
  onUpdateList: (id: string, name: string) => Promise<void>;
  onDeleteList: (id: string) => Promise<void>;
  isLoading: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

// =============================================================================
// Constants
// =============================================================================

const MAX_NAME_LENGTH = 100;

// =============================================================================
// Skeleton Loader
// =============================================================================

function ListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-9 bg-muted animate-pulse rounded-md" />
      ))}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function Sidebar({
  lists,
  activeListId,
  onSelectList,
  onCreateList,
  onUpdateList,
  onDeleteList,
  isLoading,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering create mode
  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewListName("");
    setError(null);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewListName("");
    setError(null);
  }, []);

  const handleCreateList = useCallback(async () => {
    const trimmedName = newListName.trim();

    // Validation
    if (!trimmedName) {
      setError("Nazwa listy jest wymagana");
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Nazwa może mieć max ${MAX_NAME_LENGTH} znaków`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onCreateList(trimmedName);
      setIsCreating(false);
      setNewListName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd tworzenia listy");
    } finally {
      setIsSaving(false);
    }
  }, [newListName, onCreateList]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreateList();
      } else if (e.key === "Escape") {
        handleCancelCreate();
      }
    },
    [handleCreateList, handleCancelCreate]
  );

  const handleUpdateList = useCallback(
    async (id: string, name: string) => {
      await onUpdateList(id, name);
    },
    [onUpdateList]
  );

  const handleDeleteList = useCallback(
    async (id: string) => {
      await onDeleteList(id);
    },
    [onDeleteList]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Moje listy</h2>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={handleStartCreate}
          disabled={isCreating || isLoading}
          aria-label="Utwórz nową listę"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Loading state */}
        {isLoading && <ListSkeleton />}

        {/* Empty state */}
        {!isLoading && lists.length === 0 && !isCreating && <EmptyState type="no-lists" onAction={handleStartCreate} />}

        {/* Create new list form */}
        {isCreating && (
          <div className="p-2 mb-2">
            <div className="flex items-center gap-1">
              <Input
                ref={inputRef}
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nazwa nowej listy"
                maxLength={MAX_NAME_LENGTH}
                disabled={isSaving}
                className="h-8 text-sm"
                aria-label="Nazwa nowej listy"
                aria-invalid={!!error}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={handleCancelCreate}
                disabled={isSaving}
                aria-label="Anuluj"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive mt-1 px-1">{error}</p>}
            <p className="text-xs text-muted-foreground mt-1 px-1">Naciśnij Enter, aby utworzyć</p>
          </div>
        )}

        {/* Lists */}
        {!isLoading && lists.length > 0 && (
          <nav aria-label="Listy zadań">
            <ul className="space-y-1">
              {lists.map((list) => (
                <ListItem
                  key={list.id}
                  list={list}
                  isActive={list.id === activeListId}
                  onSelect={() => onSelectList(list.id)}
                  onUpdate={(name) => handleUpdateList(list.id, name)}
                  onDelete={() => handleDeleteList(list.id)}
                />
              ))}
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
}
