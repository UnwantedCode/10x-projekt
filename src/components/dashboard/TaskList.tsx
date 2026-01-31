import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import type { TaskStatus } from "@/types";
import type { TasksByPriority } from "./types";
import { PRIORITY_CONFIGS } from "./types";
import { TaskCard } from "./TaskCard";

// =============================================================================
// Types
// =============================================================================

interface TaskListProps {
  tasksByPriority: TasksByPriority;
  isLoading: boolean;
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
}

// =============================================================================
// Icons
// =============================================================================

function AlertCircleIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ArrowDownIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14" />
      <path d="m19 12-7 7-7-7" />
    </svg>
  );
}

// =============================================================================
// Skeleton Loader
// =============================================================================

function TaskCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex gap-3">
        <Skeleton className="h-4 w-4 rounded" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

function TaskListSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((groupIdx) => (
        <div key={groupIdx} className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            {[1, 2].map((cardIdx) => (
              <TaskCardSkeleton key={cardIdx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Priority Group Component
// =============================================================================

interface PriorityGroupProps {
  priority: 1 | 2 | 3;
  tasks: TasksByPriority["high"];
  onTaskStatusChange: (taskId: string, status: TaskStatus) => void;
}

function PriorityGroup({ priority, tasks, onTaskStatusChange }: PriorityGroupProps) {
  if (tasks.length === 0) return null;

  const config = PRIORITY_CONFIGS[priority];

  const PriorityIcon = priority === 3 ? AlertCircleIcon : priority === 2 ? ArrowRightIcon : ArrowDownIcon;

  return (
    <section aria-labelledby={`priority-${priority}-heading`}>
      <div className="flex items-center gap-2 mb-3">
        <PriorityIcon className={`h-4 w-4 ${config.color}`} />
        <h2 id={`priority-${priority}-heading`} className={`text-sm font-semibold ${config.color}`}>
          {config.label} priorytet
        </h2>
        <Badge variant="secondary" className="text-xs">
          {tasks.length}
        </Badge>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusChange={(status) => onTaskStatusChange(task.id, status)} />
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// Component
// =============================================================================

export function TaskList({ tasksByPriority, isLoading, onTaskStatusChange }: TaskListProps) {
  // Loading state
  if (isLoading) {
    return <TaskListSkeleton />;
  }

  const totalTasks = tasksByPriority.high.length + tasksByPriority.medium.length + tasksByPriority.low.length;

  // Empty check (handled by parent, but safety fallback)
  if (totalTasks === 0) {
    return null;
  }

  return (
    <div className="space-y-6" role="list" aria-label="Lista zadań pogrupowana według priorytetów">
      {/* High priority */}
      <PriorityGroup priority={3} tasks={tasksByPriority.high} onTaskStatusChange={onTaskStatusChange} />

      {/* Medium priority */}
      <PriorityGroup priority={2} tasks={tasksByPriority.medium} onTaskStatusChange={onTaskStatusChange} />

      {/* Low priority */}
      <PriorityGroup priority={1} tasks={tasksByPriority.low} onTaskStatusChange={onTaskStatusChange} />
    </div>
  );
}
