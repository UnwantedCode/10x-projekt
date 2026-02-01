import { useCallback, useMemo } from "react";
import { useSensor, useSensors, PointerSensor, KeyboardSensor, type DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";

import type { TaskDTO, TaskOrderItem } from "@/types";

// =============================================================================
// Types
// =============================================================================

export interface UseTaskReorderOptions {
  tasks: TaskDTO[];
  onReorder: (taskOrders: TaskOrderItem[]) => Promise<void>;
  enabled: boolean;
}

export interface UseTaskReorderReturn {
  sensors: ReturnType<typeof useSensors>;
  handleDragEnd: (event: DragEndEvent) => void;
  sortableItems: string[];
}

// =============================================================================
// Hook
// =============================================================================

export function useTaskReorder({ tasks, onReorder, enabled }: UseTaskReorderOptions): UseTaskReorderReturn {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortableItems = useMemo(() => tasks.map((task) => task.id), [tasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!enabled) return;

      const { active, over } = event;

      if (!over || active.id === over.id) return;

      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);

      // sortOrder is 1-based (database constraint requires > 0)
      const taskOrders: TaskOrderItem[] = reorderedTasks.map((task, index) => ({
        id: task.id,
        sortOrder: index + 1,
      }));

      await onReorder(taskOrders);
    },
    [enabled, tasks, onReorder]
  );

  return {
    sensors,
    handleDragEnd,
    sortableItems,
  };
}
