import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import type { TaskDTO, UpdateTaskCommand } from "@/types";
import { TaskEditForm } from "./TaskEditForm";

// =============================================================================
// Types
// =============================================================================

interface TaskEditDialogProps {
  task: TaskDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, command: UpdateTaskCommand) => Promise<void>;
  isSaving: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function TaskEditDialog({ task, isOpen, onClose, onSave, isSaving }: TaskEditDialogProps) {
  if (!task) return null;

  const handleSubmit = async (command: UpdateTaskCommand) => {
    await onSave(task.id, command);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="edit-task-description">
        <DialogHeader>
          <DialogTitle>Edytuj zadanie</DialogTitle>
          <DialogDescription id="edit-task-description">
            Zmień tytuł, opis lub priorytet zadania. AI może zasugerować optymalny priorytet.
          </DialogDescription>
        </DialogHeader>
        <TaskEditForm task={task} onSubmit={handleSubmit} onCancel={onClose} isSubmitting={isSaving} />
      </DialogContent>
    </Dialog>
  );
}
