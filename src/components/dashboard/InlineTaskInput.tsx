import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { CreateTaskCommand, TaskPriority } from "@/types";
import { PRIORITY_CONFIGS } from "./types";
import { useAISuggestion } from "./hooks/useAISuggestion";
import { AISuggestionPanel } from "./AISuggestionPanel";

// =============================================================================
// Types
// =============================================================================

interface InlineTaskInputProps {
  listId: string;
  onSubmit: (command: CreateTaskCommand) => Promise<void>;
  isSubmitting: boolean;
}

// =============================================================================
// Icons
// =============================================================================

function PlusIcon({ className }: { className?: string }) {
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
      <path d="M12 5v14" />
    </svg>
  );
}

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
// Constants
// =============================================================================

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;
const DEFAULT_PRIORITY: TaskPriority = 2;

// =============================================================================
// Validation
// =============================================================================

interface FormErrors {
  title?: string;
  description?: string;
  priority?: string;
}

function validateForm(title: string, description: string): FormErrors {
  const errors: FormErrors = {};

  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    errors.title = "Tytuł jest wymagany";
  } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
    errors.title = `Tytuł może mieć max ${MAX_TITLE_LENGTH} znaków`;
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Opis może mieć max ${MAX_DESCRIPTION_LENGTH} znaków`;
  }

  return errors;
}

// =============================================================================
// Component
// =============================================================================

export function InlineTaskInput({ onSubmit, isSubmitting }: InlineTaskInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>(DEFAULT_PRIORITY);
  const [errors, setErrors] = useState<FormErrors>({});

  const {
    suggestion,
    isLoading: isSuggesting,
    isProcessingDecision,
    requestSuggestion,
    acceptSuggestion,
    modifySuggestion,
    rejectSuggestion,
    clearSuggestion,
  } = useAISuggestion({
    taskId: null,
    onPriorityUpdate: setPriority,
  });

  const resetForm = useCallback(() => {
    setTitle("");
    setDescription("");
    setPriority(DEFAULT_PRIORITY);
    setErrors({});
    clearSuggestion();
    setIsExpanded(false);
  }, [clearSuggestion]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const validationErrors = validateForm(title, description);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      try {
        await onSubmit({
          title: title.trim(),
          description: description.trim() || null,
          priority,
        });
        resetForm();
      } catch {
        // Error handled by parent
      }
    },
    [title, description, priority, onSubmit, resetForm]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        resetForm();
      }
    },
    [handleSubmit, resetForm]
  );

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setErrors((prev) => ({ ...prev, title: undefined }));
  }, []);

  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
    setErrors((prev) => ({ ...prev, description: undefined }));
  }, []);

  const handlePriorityChange = useCallback((value: string) => {
    setPriority(Number(value) as TaskPriority);
  }, []);

  const handleRequestSuggestion = useCallback(() => {
    requestSuggestion(title, description.trim() || null);
  }, [title, description, requestSuggestion]);

  // Collapsed state - just show a button to expand
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="
          w-full flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border
          text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-card
          transition-all duration-200 ease-in-out bg-card/50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        "
        aria-label="Dodaj nowe zadanie"
      >
        <PlusIcon className="h-4 w-4 transition-transform group-hover:rotate-90" />
        <span className="text-sm">Dodaj zadanie...</span>
      </button>
    );
  }

  // Expanded form
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-card p-4 shadow-sm animate-in fade-in-0 slide-in-from-bottom-2 duration-200"
      aria-label="Formularz dodawania zadania"
    >
      <div className="space-y-4">
        {/* Title input */}
        <div className="space-y-1.5">
          <Label htmlFor="task-title" className="sr-only">
            Tytuł zadania
          </Label>
          <Input
            id="task-title"
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            placeholder="Tytuł zadania"
            maxLength={MAX_TITLE_LENGTH}
            disabled={isSubmitting}
            autoFocus
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "title-error" : undefined}
          />
          {errors.title && (
            <p id="title-error" className="text-xs text-destructive">
              {errors.title}
            </p>
          )}
        </div>

        {/* Description textarea */}
        <div className="space-y-1.5">
          <Label htmlFor="task-description" className="sr-only">
            Opis zadania (opcjonalny)
          </Label>
          <textarea
            id="task-description"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Opis (opcjonalny)"
            maxLength={MAX_DESCRIPTION_LENGTH}
            disabled={isSubmitting}
            rows={2}
            className="
              w-full rounded-md border border-input bg-background px-3 py-2 text-sm
              placeholder:text-muted-foreground focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
              disabled:cursor-not-allowed disabled:opacity-50 resize-none
            "
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : undefined}
          />
          {errors.description && (
            <p id="description-error" className="text-xs text-destructive">
              {errors.description}
            </p>
          )}
        </div>

        {/* Priority and actions row */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Priority selector + AI suggestion */}
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="task-priority" className="text-sm text-muted-foreground whitespace-nowrap">
                Priorytet:
              </Label>
              <Select value={String(priority)} onValueChange={handlePriorityChange} disabled={isSubmitting}>
                <SelectTrigger id="task-priority" className="w-[140px]" aria-label="Wybierz priorytet">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {([3, 2, 1] as TaskPriority[]).map((p) => {
                    const config = PRIORITY_CONFIGS[p];
                    return (
                      <SelectItem key={p} value={String(p)}>
                        <span className={config.color}>{config.label}</span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRequestSuggestion}
                disabled={isSubmitting || isSuggesting || isProcessingDecision || !title.trim()}
                className="shrink-0 gap-1.5"
                aria-label="Zasugeruj priorytet na podstawie tytułu i opisu"
              >
                {isSuggesting ? (
                  <>
                    <span
                      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                      aria-hidden
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
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={resetForm} disabled={isSubmitting}>
                Anuluj
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting || !title.trim()}>
                {isSubmitting ? "Dodawanie..." : "Dodaj"}
              </Button>
            </div>
          </div>

          {/* AI suggestion panel */}
          {suggestion && (
            <AISuggestionPanel
              suggestion={suggestion}
              currentPriority={priority}
              onAccept={acceptSuggestion}
              onModify={modifySuggestion}
              onReject={rejectSuggestion}
              isProcessing={isProcessingDecision}
            />
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-muted-foreground mt-3">
        Naciśnij <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> aby dodać lub{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> aby anulować
      </p>
    </form>
  );
}
