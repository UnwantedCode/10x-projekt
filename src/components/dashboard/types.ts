import type { ListDTO, TaskDTO, TaskPriority, TaskStatus, ProfileDTO, TaskSortField, SortOrder } from "@/types";

// =============================================================================
// Filter State Types
// =============================================================================

/**
 * State for task list filters
 */
export interface TaskFilterState {
  /** Filter by status: null = all, 1 = todo, 2 = done */
  status: TaskStatus | null;
  /** Filter by priority: null = all priorities */
  priority: TaskPriority | null;
  /** Search query string */
  search: string;
  /** Sort field */
  sort: TaskSortField;
  /** Sort direction */
  order: SortOrder;
}

/**
 * Default filter state values
 */
export const DEFAULT_FILTER_STATE: TaskFilterState = {
  status: 1, // Default to showing only todo tasks
  priority: null,
  search: "",
  sort: "priority",
  order: "desc",
};

// =============================================================================
// Task Grouping Types
// =============================================================================

/**
 * Tasks grouped by priority level
 */
export interface TasksByPriority {
  /** High priority tasks (priority = 3) */
  high: TaskDTO[];
  /** Medium priority tasks (priority = 2) */
  medium: TaskDTO[];
  /** Low priority tasks (priority = 1) */
  low: TaskDTO[];
}

/**
 * Priority configuration for display
 */
export interface PriorityConfig {
  label: string;
  value: TaskPriority;
  color: string;
  bgColor: string;
}

/**
 * Priority configurations for UI rendering
 */
export const PRIORITY_CONFIGS: Record<TaskPriority, PriorityConfig> = {
  3: {
    label: "Wysoki",
    value: 3,
    color: "text-red-700 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
  },
  2: {
    label: "Średni",
    value: 2,
    color: "text-yellow-700 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
  },
  1: {
    label: "Niski",
    value: 1,
    color: "text-gray-700 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-800",
  },
};

// =============================================================================
// List Item Types
// =============================================================================

/**
 * Extended ListDTO with editing state for sidebar list items
 */
export interface ListItemViewModel extends ListDTO {
  /** Whether the item is in edit mode */
  isEditing: boolean;
  /** Current value in edit input */
  editName: string;
  /** Whether delete operation is in progress */
  isDeleting: boolean;
}

/**
 * Creates a ListItemViewModel from a ListDTO
 */
export function createListItemViewModel(list: ListDTO): ListItemViewModel {
  return {
    ...list,
    isEditing: false,
    editName: list.name,
    isDeleting: false,
  };
}

// =============================================================================
// Empty State Types
// =============================================================================

/**
 * Type of empty state to display
 */
export type EmptyStateType = "no-lists" | "no-tasks" | "no-active-list";

/**
 * Configuration for empty state display
 */
export interface EmptyStateConfig {
  type: EmptyStateType;
  title: string;
  description: string;
  actionLabel: string;
}

/**
 * Empty state configurations
 */
export const EMPTY_STATE_CONFIGS: Record<EmptyStateType, Omit<EmptyStateConfig, "type">> = {
  "no-lists": {
    title: "Brak list",
    description: "Utwórz swoją pierwszą listę zadań, aby rozpocząć organizację pracy.",
    actionLabel: "Utwórz listę",
  },
  "no-tasks": {
    title: "Brak zadań",
    description: "Ta lista jest pusta. Dodaj swoje pierwsze zadanie.",
    actionLabel: "Dodaj zadanie",
  },
  "no-active-list": {
    title: "Wybierz listę",
    description: "Wybierz listę z menu bocznego, aby zobaczyć zadania.",
    actionLabel: "Zobacz listy",
  },
};

// =============================================================================
// Onboarding Types
// =============================================================================

/**
 * Single onboarding step configuration
 */
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  illustration?: string;
}

/**
 * Onboarding wizard steps
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    title: "Witaj w AI Task Manager!",
    description:
      "Organizuj swoje zadania według priorytetów. Każde zadanie może mieć priorytet: Wysoki, Średni lub Niski. Priorytety pomagają skupić się na tym, co najważniejsze.",
  },
  {
    id: 2,
    title: "Inteligentne sortowanie",
    description:
      "Zadania są automatycznie grupowane według priorytetów. Najważniejsze zadania zawsze widoczne są na górze listy, co ułatwia planowanie dnia.",
  },
  {
    id: 3,
    title: "AI jako Twój asystent",
    description:
      "Sztuczna inteligencja może sugerować priorytety na podstawie opisu zadania. Pamiętaj - to tylko sugestie. Ostateczna decyzja zawsze należy do Ciebie.",
  },
];

/**
 * Current onboarding version
 */
export const CURRENT_ONBOARDING_VERSION = 1;

// =============================================================================
// Dashboard State Types
// =============================================================================

/**
 * Main dashboard state
 */
export interface DashboardState {
  /** User profile */
  profile: ProfileDTO | null;
  /** User's task lists */
  lists: ListDTO[];
  /** Tasks for active list */
  tasks: TaskDTO[];
  /** Currently active list ID */
  activeListId: string | null;
  /** Current filter state */
  filters: TaskFilterState;
  /** Loading states */
  isLoadingProfile: boolean;
  isLoadingLists: boolean;
  isLoadingTasks: boolean;
  /** Whether more tasks can be loaded */
  hasMoreTasks: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Initial dashboard state
 */
export const INITIAL_DASHBOARD_STATE: DashboardState = {
  profile: null,
  lists: [],
  tasks: [],
  activeListId: null,
  filters: DEFAULT_FILTER_STATE,
  isLoadingProfile: true,
  isLoadingLists: true,
  isLoadingTasks: false,
  hasMoreTasks: false,
  error: null,
};

// =============================================================================
// Pagination Constants
// =============================================================================

/**
 * Number of tasks to fetch per page
 */
export const TASKS_PAGE_SIZE = 50;

/**
 * Maximum number of lists to fetch
 */
export const LISTS_PAGE_SIZE = 100;

/**
 * Debounce delay for search input (ms)
 */
export const SEARCH_DEBOUNCE_MS = 300;
