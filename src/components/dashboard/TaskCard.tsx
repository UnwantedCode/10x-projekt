import { useCallback, useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import type { TaskDTO, TaskStatus } from "@/types";
import { PRIORITY_CONFIGS } from "./types";

// =============================================================================
// Types
// =============================================================================

interface TaskCardProps {
  task: TaskDTO;
  onStatusChange: (status: TaskStatus) => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formats a date as relative time (e.g., "2 dni temu")
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return "przed chwilą";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min temu`;
  }
  if (diffHours < 24) {
    return `${diffHours} godz. temu`;
  }
  if (diffDays === 1) {
    return "wczoraj";
  }
  if (diffDays < 7) {
    return `${diffDays} dni temu`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks} tyg. temu`;
  }
  if (diffMonths < 12) {
    return `${diffMonths} mies. temu`;
  }

  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// =============================================================================
// Component
// =============================================================================

export function TaskCard({ task, onStatusChange }: TaskCardProps) {
  const priorityConfig = PRIORITY_CONFIGS[task.priority as 1 | 2 | 3];
  const isDone = task.status === 2;

  const handleCheckboxChange = useCallback(
    (checked: boolean) => {
      onStatusChange(checked ? 2 : 1);
    },
    [onStatusChange]
  );

  const relativeTime = useMemo(() => formatRelativeTime(task.createdAt), [task.createdAt]);

  return (
    <article
      className={`
        group relative rounded-lg border border-border bg-card p-4
        transition-all duration-200 ease-in-out
        hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5
        focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
        ${isDone ? "opacity-60" : ""}
      `}
      aria-label={`Zadanie: ${task.title}`}
    >
      <div className="flex gap-3">
        {/* Checkbox */}
        <div className="pt-0.5">
          <Checkbox
            checked={isDone}
            onCheckedChange={handleCheckboxChange}
            aria-label={isDone ? `Oznacz "${task.title}" jako niezrobione` : `Oznacz "${task.title}" jako zrobione`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={`
                text-sm font-medium leading-tight
                ${isDone ? "line-through text-muted-foreground" : "text-foreground"}
              `}
            >
              {task.title}
            </h3>

            {/* Priority badge */}
            <Badge variant="secondary" className={`shrink-0 text-xs ${priorityConfig.color} ${priorityConfig.bgColor}`}>
              {priorityConfig.label}
            </Badge>
          </div>

          {/* Description */}
          {task.description && (
            <p
              className={`
                text-sm leading-snug line-clamp-2
                ${isDone ? "text-muted-foreground/70" : "text-muted-foreground"}
              `}
            >
              {task.description}
            </p>
          )}

          {/* Metadata row */}
          <div className="flex items-center gap-3 mt-2">
            <time
              dateTime={task.createdAt}
              className="text-xs text-muted-foreground"
              title={new Date(task.createdAt).toLocaleString("pl-PL")}
            >
              {relativeTime}
            </time>

            {isDone && task.doneAt && (
              <span className="text-xs text-muted-foreground">• Zrobione {formatRelativeTime(task.doneAt)}</span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
