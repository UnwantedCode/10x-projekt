import { useState, useCallback } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { TaskDTO, UpdateTaskCommand } from "@/types";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { TaskEditForm } from "./TaskEditForm";

// =============================================================================
// Types
// =============================================================================

interface TaskEditDialogProps {
  task: TaskDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, command: UpdateTaskCommand) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  isSaving: boolean;
  isDeleting?: boolean;
  deleteError?: string | null;
}

// =============================================================================
// Component
// =============================================================================

export function TaskEditDialog({
  task,
  isOpen,
  onClose,
  onSave,
  onDelete,
  isSaving,
  isDeleting = false,
  deleteError = null,
}: TaskEditDialogProps) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleSubmit = useCallback(
    async (command: UpdateTaskCommand) => {
      await onSave(task!.id, command);
    },
    [task, onSave]
  );

  const handleDeleteClick = useCallback(() => {
    setIsDeleteConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!task) return;
    try {
      await onDelete(task.id);
      setIsDeleteConfirmOpen(false);
      onClose();
    } catch {
      // Error handled by parent (toast); keep AlertDialog open so user can retry or cancel
    }
  }, [task, onDelete, onClose]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteConfirmOpen(false);
  }, []);

  if (!task) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]" aria-describedby="edit-task-description">
          <DialogHeader>
            <DialogTitle>Edytuj zadanie</DialogTitle>
            <DialogDescription id="edit-task-description">
              Zmień tytuł, opis lub priorytet zadania. AI może zasugerować optymalny priorytet.
            </DialogDescription>
          </DialogHeader>
          <TaskEditForm task={task} onSubmit={handleSubmit} onCancel={onClose} isSubmitting={isSaving} />
          <DialogFooter className="border-t pt-4 mt-4 justify-start">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteClick}
              disabled={isSaving || isDeleting}
              aria-label="Usuń zadanie"
            >
              Usuń zadanie
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmationDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open) handleCancelDelete();
        }}
        itemType="task"
        itemName={task.title ?? ""}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </>
  );
}
