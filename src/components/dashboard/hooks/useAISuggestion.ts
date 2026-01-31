import { useState, useCallback } from "react";

import { suggestPriority, recordAIDecision } from "@/lib/api/dashboard.api";
import { ApiError, NotFoundError, ConflictError } from "@/lib/api/errors";
import { getErrorMessage } from "@/lib/api/errors";
import type { AISuggestionDTO, TaskPriority } from "@/types";
import { toast } from "sonner";

// =============================================================================
// Types
// =============================================================================

export interface UseAISuggestionOptions {
  taskId?: string | null;
  onPriorityUpdate: (priority: TaskPriority) => void;
}

export interface UseAISuggestionReturn {
  suggestion: AISuggestionDTO | null;
  isLoading: boolean;
  error: string | null;
  isProcessingDecision: boolean;

  requestSuggestion: (title: string, description: string | null) => Promise<void>;
  acceptSuggestion: () => Promise<void>;
  modifySuggestion: (priority: TaskPriority) => Promise<void>;
  rejectSuggestion: (reason: string) => Promise<void>;
  clearSuggestion: () => void;
  clearError: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useAISuggestion({ taskId, onPriorityUpdate }: UseAISuggestionOptions): UseAISuggestionReturn {
  const [suggestion, setSuggestion] = useState<AISuggestionDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingDecision, setIsProcessingDecision] = useState(false);

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const requestSuggestion = useCallback(
    async (title: string, description: string | null) => {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length === 0) return;

      setIsLoading(true);
      setError(null);
      setSuggestion(null);

      try {
        const data = await suggestPriority({
          taskId: taskId ?? null,
          title: trimmedTitle,
          description: description?.trim() || null,
        });
        setSuggestion(data);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        if (err instanceof ApiError && err.statusCode === 503) {
          toast.error(message, { duration: 5000 });
        } else if (err instanceof ApiError && err.statusCode !== 503) {
          toast.error(message, { duration: 5000 });
        } else {
          toast.error(message, { duration: 5000 });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [taskId]
  );

  const acceptSuggestion = useCallback(async () => {
    if (!suggestion) return;

    setIsProcessingDecision(true);

    try {
      if (taskId) {
        try {
          await recordAIDecision(suggestion.interactionId, { decision: 1 });
        } catch (err) {
          if (err instanceof NotFoundError) {
            toast.error("Decyzja nie została zapisana.", { duration: 5000 });
          } else if (err instanceof ConflictError) {
            toast.error("Decyzja została już zapisana.", { duration: 5000 });
          } else {
            toast.error(getErrorMessage(err), { duration: 5000 });
          }
          setSuggestion(null);
          return;
        }
      }

      onPriorityUpdate(suggestion.suggestedPriority as TaskPriority);
      setSuggestion(null);
    } finally {
      setIsProcessingDecision(false);
    }
  }, [suggestion, taskId, onPriorityUpdate]);

  const modifySuggestion = useCallback(
    async (priority: TaskPriority) => {
      if (!suggestion) return;

      setIsProcessingDecision(true);

      try {
        if (taskId) {
          try {
            await recordAIDecision(suggestion.interactionId, {
              decision: 2,
              finalPriority: priority,
            });
          } catch (err) {
            if (err instanceof NotFoundError) {
              toast.error("Decyzja nie została zapisana.", { duration: 5000 });
            } else if (err instanceof ConflictError) {
              toast.error("Decyzja została już zapisana.", { duration: 5000 });
            } else {
              toast.error(getErrorMessage(err), { duration: 5000 });
            }
            setSuggestion(null);
            return;
          }
        }

        onPriorityUpdate(priority);
        setSuggestion(null);
      } finally {
        setIsProcessingDecision(false);
      }
    },
    [suggestion, taskId, onPriorityUpdate]
  );

  const rejectSuggestion = useCallback(
    async (reason: string) => {
      if (!suggestion) return;

      setIsProcessingDecision(true);

      try {
        if (taskId) {
          try {
            await recordAIDecision(suggestion.interactionId, {
              decision: 3,
              rejectedReason: reason.trim(),
            });
          } catch (err) {
            if (err instanceof NotFoundError) {
              toast.error("Decyzja nie została zapisana.", { duration: 5000 });
            } else if (err instanceof ConflictError) {
              toast.error("Decyzja została już zapisana.", { duration: 5000 });
            } else {
              toast.error(getErrorMessage(err), { duration: 5000 });
            }
            setSuggestion(null);
            return;
          }
        }

        setSuggestion(null);
      } finally {
        setIsProcessingDecision(false);
      }
    },
    [suggestion, taskId]
  );

  return {
    suggestion,
    isLoading,
    error,
    isProcessingDecision,
    requestSuggestion,
    acceptSuggestion,
    modifySuggestion,
    rejectSuggestion,
    clearSuggestion,
    clearError,
  };
}
