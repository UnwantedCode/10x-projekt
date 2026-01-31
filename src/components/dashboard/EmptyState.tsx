import { Button } from "@/components/ui/button";

import type { EmptyStateType } from "./types";
import { EMPTY_STATE_CONFIGS } from "./types";

// =============================================================================
// Types
// =============================================================================

interface EmptyStateProps {
  type: EmptyStateType;
  onAction: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function ListIcon({ className }: { className?: string }) {
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
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
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
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function FolderOpenIcon({ className }: { className?: string }) {
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
      <path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const config = EMPTY_STATE_CONFIGS[type];

  const Icon = type === "no-lists" ? FolderOpenIcon : type === "no-tasks" ? CheckCircleIcon : ListIcon;

  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
      role="status"
      aria-label={config.title}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-2">{config.title}</h2>

      <p className="text-sm text-muted-foreground max-w-sm mb-6">{config.description}</p>

      <Button onClick={onAction}>{config.actionLabel}</Button>
    </div>
  );
}
