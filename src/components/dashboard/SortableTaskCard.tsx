import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { TaskDTO, TaskStatus } from "@/types";
import { TaskCard } from "./TaskCard";

// =============================================================================
// Types
// =============================================================================

interface SortableTaskCardProps {
  task: TaskDTO;
  onStatusChange: (status: TaskStatus) => void;
  onEdit?: (task: TaskDTO) => void;
  isDragEnabled: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function GripVerticalIcon({ className }: { className?: string }) {
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
      aria-hidden="true"
    >
      <circle cx="9" cy="12" r="1" />
      <circle cx="9" cy="5" r="1" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" />
      <circle cx="15" cy="5" r="1" />
      <circle cx="15" cy="19" r="1" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SortableTaskCard({ task, onStatusChange, onEdit, isDragEnabled }: SortableTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative flex items-stretch
        ${isDragging ? "opacity-50 z-50" : ""}
      `}
    >
      {/* Drag handle */}
      {isDragEnabled && (
        <button
          type="button"
          className="
            flex items-center justify-center w-6 shrink-0
            cursor-grab active:cursor-grabbing
            text-muted-foreground hover:text-foreground
            focus-visible:outline-none focus-visible:ring-2
            focus-visible:ring-ring focus-visible:ring-offset-2
            rounded-l-lg border-y border-l border-border bg-muted/30
            transition-colors
          "
          aria-label={`Przeciągnij zadanie "${task.title}"`}
          aria-roledescription="przeciągany element"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="h-4 w-4" />
        </button>
      )}

      {/* Task card */}
      <div className={`flex-1 ${isDragEnabled ? "-ml-px" : ""}`}>
        <TaskCard task={task} onStatusChange={onStatusChange} onEdit={onEdit} />
      </div>
    </div>
  );
}
