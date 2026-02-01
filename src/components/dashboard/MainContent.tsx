import { useCallback, useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

import type { ListDTO, TaskDTO, CreateTaskCommand, UpdateTaskCommand, TaskStatus } from "@/types";

import { useTasks } from "./hooks/useTasks";
import { useInfiniteScroll } from "./hooks/useInfiniteScroll";
import { useTaskReorder } from "./hooks/useTaskReorder";

import { FilterToolbar } from "./FilterToolbar";
import { TaskList } from "./TaskList";
import { InlineTaskInput } from "./InlineTaskInput";
import { EmptyState } from "./EmptyState";
import { TaskEditDialog } from "./TaskEditDialog";
import { Skeleton } from "@/components/ui/skeleton";

// =============================================================================
// Types
// =============================================================================

interface MainContentProps {
  activeList: ListDTO | null;
  showOnboarding: boolean;
  onCompleteOnboarding: () => void;
  onStartCreateList: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function Loader2Icon({ className }: { className?: string }) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// =============================================================================
// Load More Trigger Component
// =============================================================================

interface LoadMoreTriggerProps {
  triggerRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  hasMore: boolean;
}

function LoadMoreTrigger({ triggerRef, isLoading, hasMore }: LoadMoreTriggerProps) {
  if (!hasMore && !isLoading) return null;

  return (
    <div ref={triggerRef} className="flex justify-center py-6">
      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="h-4 w-4 animate-spin" />
          <span className="text-sm">Ładowanie kolejnych zadań...</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// List Header Component
// =============================================================================

interface ListHeaderProps {
  listName: string;
  totalCount: number;
  isLoading: boolean;
}

function ListHeader({ listName, totalCount, isLoading }: ListHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-6">
      <h1 className="text-2xl font-bold text-foreground truncate">{listName}</h1>
      {!isLoading && (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {totalCount} {totalCount === 1 ? "zadanie" : totalCount < 5 ? "zadania" : "zadań"}
        </span>
      )}
      {isLoading && <Skeleton className="h-4 w-16" />}
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function MainContent({ activeList, onStartCreateList }: MainContentProps) {
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  // Tasks hook - fetch tasks for active list
  const {
    tasks,
    tasksByPriority,
    filters,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    error: tasksError,
    setFilters,
    loadMore,
    createTask,
    updateTask,
    updateTaskStatus,
    reorderTasks,
    clearError: clearTasksError,
  } = useTasks(activeList?.id ?? null);

  // Determine if DnD is enabled (custom sort order)
  const isDragEnabled = useMemo(() => filters.sort === "sort_order" && !isLoading, [filters.sort, isLoading]);

  // Task reorder hook
  const { sensors, handleDragEnd, sortableItems } = useTaskReorder({
    tasks,
    onReorder: reorderTasks,
    enabled: isDragEnabled,
  });

  // Show error toast when tasks error changes
  useEffect(() => {
    if (tasksError) {
      toast.error(tasksError, {
        duration: 5000,
        action: {
          label: "Zamknij",
          onClick: () => clearTasksError(),
        },
      });
    }
  }, [tasksError, clearTasksError]);

  // Infinite scroll hook
  const { triggerRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading: isLoadingMore,
    enabled: !!activeList && !isLoading,
  });

  // Handlers
  const handleCreateTask = useCallback(
    async (command: CreateTaskCommand) => {
      setIsSubmittingTask(true);
      try {
        await createTask(command);
        toast.success("Zadanie zostało dodane");
      } catch {
        // Error handled by hook
      } finally {
        setIsSubmittingTask(false);
      }
    },
    [createTask]
  );

  const handleTaskStatusChange = useCallback(
    async (taskId: string, status: TaskStatus) => {
      try {
        await updateTaskStatus(taskId, status);
      } catch {
        // Error handled by hook
      }
    },
    [updateTaskStatus]
  );

  const handleEditTask = useCallback((task: TaskDTO) => {
    setEditingTask(task);
  }, []);

  const handleSaveTask = useCallback(
    async (taskId: string, command: UpdateTaskCommand) => {
      setIsSavingTask(true);
      try {
        await updateTask(taskId, command);
        toast.success("Zadanie zostało zaktualizowane");
        setEditingTask(null);
      } catch {
        // Error handled by hook
      } finally {
        setIsSavingTask(false);
      }
    },
    [updateTask]
  );

  const handleCloseEdit = useCallback(() => {
    setEditingTask(null);
  }, []);

  const handleStartAddTask = useCallback(() => {
    // This is handled by InlineTaskInput's expand state
    // Just a placeholder for EmptyState action
  }, []);

  // No active list selected
  if (!activeList) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6">
        <EmptyState type="no-active-list" onAction={onStartCreateList} />
      </div>
    );
  }

  const hasTasks = tasksByPriority.high.length + tasksByPriority.medium.length + tasksByPriority.low.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* List header */}
        <ListHeader listName={activeList.name} totalCount={totalCount} isLoading={isLoading} />

        {/* Filter toolbar */}
        <div className="mb-6">
          <FilterToolbar filters={filters} onFiltersChange={setFilters} disabled={isLoading && !hasTasks} />
        </div>

        {/* Task list or empty state */}
        {!isLoading && !hasTasks ? (
          <EmptyState type="no-tasks" onAction={handleStartAddTask} />
        ) : (
          <TaskList
            tasksByPriority={tasksByPriority}
            tasks={tasks}
            isLoading={isLoading}
            onTaskStatusChange={handleTaskStatusChange}
            onTaskEdit={handleEditTask}
            isDragEnabled={isDragEnabled}
            sensors={sensors}
            onDragEnd={handleDragEnd}
            sortableItems={sortableItems}
          />
        )}

        {/* Load more trigger for infinite scroll */}
        <LoadMoreTrigger
          triggerRef={triggerRef as React.RefObject<HTMLDivElement>}
          isLoading={isLoadingMore}
          hasMore={hasMore}
        />
      </div>

      {/* Sticky task input at bottom */}
      <div className="border-t border-border bg-card p-4">
        <InlineTaskInput listId={activeList.id} onSubmit={handleCreateTask} isSubmitting={isSubmittingTask} />
      </div>

      {/* Edit task dialog */}
      <TaskEditDialog
        task={editingTask}
        isOpen={!!editingTask}
        onClose={handleCloseEdit}
        onSave={handleSaveTask}
        isSaving={isSavingTask}
      />
    </div>
  );
}
