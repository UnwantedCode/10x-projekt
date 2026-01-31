// Main dashboard component
export { Dashboard } from "./Dashboard";

// Layout components
export { Header } from "./Header";
export { Sidebar } from "./Sidebar";
export { MainContent } from "./MainContent";

// List components
export { ListItem } from "./ListItem";

// Task components
export { FilterToolbar } from "./FilterToolbar";
export { TaskList } from "./TaskList";
export { TaskCard } from "./TaskCard";
export { InlineTaskInput } from "./InlineTaskInput";

// Utility components
export { EmptyState } from "./EmptyState";
export { OnboardingWizard } from "./OnboardingWizard";

// Hooks
export { useDashboard } from "./hooks/useDashboard";
export { useTasks } from "./hooks/useTasks";
export { useInfiniteScroll } from "./hooks/useInfiniteScroll";

// Types
export type {
  TaskFilterState,
  TasksByPriority,
  ListItemViewModel,
  EmptyStateType,
  EmptyStateConfig,
  OnboardingStep,
  DashboardState,
  PriorityConfig,
} from "./types";

export {
  DEFAULT_FILTER_STATE,
  PRIORITY_CONFIGS,
  EMPTY_STATE_CONFIGS,
  ONBOARDING_STEPS,
  CURRENT_ONBOARDING_VERSION,
  INITIAL_DASHBOARD_STATE,
  TASKS_PAGE_SIZE,
  LISTS_PAGE_SIZE,
  SEARCH_DEBOUNCE_MS,
  createListItemViewModel,
} from "./types";
