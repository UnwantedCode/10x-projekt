import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { TaskDTO, TaskPriority, UpdateTaskCommand } from "@/types";
import { PRIORITY_CONFIGS } from "./types";
import { useAISuggestion } from "./hooks/useAISuggestion";
import { AISuggestionPanel } from "./AISuggestionPanel";
import { AISuggestionButton } from "./AISuggestionButton";

// =============================================================================
// Types
// =============================================================================

interface TaskEditFormProps {
  task: TaskDTO;
  onSubmit: (command: UpdateTaskCommand) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 2000;

// =============================================================================
// Validation
// =============================================================================

interface FormErrors {
  title?: string;
  description?: string;
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

export function TaskEditForm({ task, onSubmit, onCancel, isSubmitting }: TaskEditFormProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task.priority as TaskPriority);
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
    taskId: task.id,
    onPriorityUpdate: setPriority,
  });

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const validationErrors = validateForm(title, description);

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      clearSuggestion();

      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        priority,
      });
    },
    [title, description, priority, onSubmit, clearSuggestion]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === "Escape") {
        onCancel();
      }
    },
    [handleSubmit, onCancel]
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

  const isDisabled = isSubmitting || isProcessingDecision;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" aria-label="Formularz edycji zadania">
      {/* Title input */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-task-title">Tytuł</Label>
        <Input
          id="edit-task-title"
          value={title}
          onChange={handleTitleChange}
          onKeyDown={handleKeyDown}
          placeholder="Tytuł zadania"
          maxLength={MAX_TITLE_LENGTH}
          disabled={isDisabled}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "edit-title-error" : undefined}
        />
        {errors.title && (
          <p id="edit-title-error" className="text-xs text-destructive">
            {errors.title}
          </p>
        )}
      </div>

      {/* Description textarea */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-task-description">Opis (opcjonalny)</Label>
        <textarea
          id="edit-task-description"
          value={description}
          onChange={handleDescriptionChange}
          onKeyDown={handleKeyDown}
          placeholder="Opis zadania"
          maxLength={MAX_DESCRIPTION_LENGTH}
          disabled={isDisabled}
          rows={3}
          className="
            w-full rounded-md border border-input bg-background px-3 py-2 text-sm
            placeholder:text-muted-foreground focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
            disabled:cursor-not-allowed disabled:opacity-50 resize-none
          "
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "edit-description-error" : undefined}
        />
        {errors.description && (
          <p id="edit-description-error" className="text-xs text-destructive">
            {errors.description}
          </p>
        )}
      </div>

      {/* Priority selector + AI suggestion */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="edit-task-priority" className="text-sm whitespace-nowrap">
              Priorytet:
            </Label>
            <Select value={String(priority)} onValueChange={handlePriorityChange} disabled={isDisabled}>
              <SelectTrigger id="edit-task-priority" className="w-[140px]" aria-label="Wybierz priorytet">
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
          </div>
          <AISuggestionButton
            onClick={handleRequestSuggestion}
            isLoading={isSuggesting}
            disabled={isDisabled || !title.trim()}
          />
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

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isDisabled}>
          Anuluj
        </Button>
        <Button type="submit" disabled={isDisabled || !title.trim()}>
          {isSubmitting ? "Zapisywanie..." : "Zapisz"}
        </Button>
      </div>

      {/* Keyboard hints */}
      <p className="text-xs text-muted-foreground">
        Naciśnij <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> aby zapisać lub{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> aby anulować
      </p>
    </form>
  );
}
