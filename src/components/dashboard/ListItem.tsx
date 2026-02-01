import { useState, useCallback, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ListDTO } from "@/types";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";

// =============================================================================
// Types
// =============================================================================

interface ListItemProps {
  list: ListDTO;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

// =============================================================================
// Icons
// =============================================================================

function EditIcon({ className }: { className?: string }) {
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
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
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
// Component
// =============================================================================

export function ListItem({ list, isActive, onSelect, onUpdate, onDelete }: ListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Reset edit name when list changes
  useEffect(() => {
    setEditName(list.name);
  }, [list.name]);

  const handleStartEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsEditing(true);
      setEditName(list.name);
      setError(null);
    },
    [list.name]
  );

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditName(list.name);
    setError(null);
  }, [list.name]);

  const handleSaveEdit = useCallback(async () => {
    const trimmedName = editName.trim();

    // Validation
    if (!trimmedName) {
      setError("Nazwa listy jest wymagana");
      return;
    }

    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Nazwa może mieć max ${MAX_NAME_LENGTH} znaków`);
      return;
    }

    // No changes
    if (trimmedName === list.name) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onUpdate(trimmedName);
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setIsSaving(false);
    }
  }, [editName, list.name, onUpdate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteError(null);
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      setIsDeleteConfirmOpen(false);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Błąd usuwania listy.");
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteConfirmOpen(false);
    setDeleteError(null);
  }, []);

  // Edit mode
  if (isEditing) {
    return (
      <li className="p-2">
        <div className="flex items-center gap-1">
          <Input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveEdit}
            maxLength={MAX_NAME_LENGTH}
            disabled={isSaving}
            className="h-8 text-sm"
            aria-label="Nazwa listy"
            aria-invalid={!!error}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleSaveEdit}
            disabled={isSaving}
            aria-label="Zapisz"
          >
            <CheckIcon className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleCancelEdit}
            disabled={isSaving}
            aria-label="Anuluj"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
        {error && <p className="text-xs text-destructive mt-1 px-1">{error}</p>}
      </li>
    );
  }

  // View mode
  return (
    <li>
      <button
        onClick={onSelect}
        disabled={isDeleting}
        className={`
          w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm text-left
          transition-all duration-150 ease-in-out group
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
          ${
            isActive
              ? "bg-primary/10 text-primary font-medium border-l-2 border-primary shadow-sm"
              : "text-foreground hover:bg-muted hover:translate-x-0.5"
          }
          ${isDeleting ? "opacity-50 pointer-events-none" : ""}
        `}
        aria-current={isActive ? "page" : undefined}
        aria-label={`Lista: ${list.name}${isActive ? " (aktywna)" : ""}`}
      >
        <span className="truncate flex-1">{list.name}</span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={handleStartEdit}
            disabled={isDeleting}
            aria-label={`Edytuj listę ${list.name}`}
          >
            <EditIcon className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            aria-label={`Usuń listę ${list.name}`}
          >
            <TrashIcon className="h-3 w-3" />
          </Button>
        </div>
      </button>

      <DeleteConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelDelete();
          else setIsDeleteConfirmOpen(true);
        }}
        itemType="list"
        itemName={list.name}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </li>
  );
}
