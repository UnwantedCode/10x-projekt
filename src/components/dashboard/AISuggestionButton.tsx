import { Button } from "@/components/ui/button";

// =============================================================================
// Types
// =============================================================================

export interface AISuggestionButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function SparklesIcon({ className }: { className?: string }) {
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
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AISuggestionButton({ onClick, isLoading, disabled = false }: AISuggestionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="shrink-0 gap-1.5"
      aria-label="Zasugeruj priorytet na podstawie tytułu i opisu"
    >
      {isLoading ? (
        <>
          <span
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
            aria-hidden="true"
          />
          <span className="hidden sm:inline">Sugeruję...</span>
        </>
      ) : (
        <>
          <SparklesIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Zasugeruj priorytet</span>
        </>
      )}
    </Button>
  );
}
