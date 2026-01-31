import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export interface RejectionReasonInputProps {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
  maxLength?: number;
}

const DEFAULT_MAX_LENGTH = 300;

const EMPTY_ERROR = "Podaj powód odrzucenia sugestii";

function getMaxLengthError(max: number): string {
  return `Powód może mieć maksymalnie ${max} znaków`;
}

// =============================================================================
// Component
// =============================================================================

export function RejectionReasonInput({
  onConfirm,
  onCancel,
  isProcessing,
  maxLength = DEFAULT_MAX_LENGTH,
}: RejectionReasonInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = useCallback(() => {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      setError(EMPTY_ERROR);
      return;
    }

    if (trimmed.length > maxLength) {
      setError(getMaxLengthError(maxLength));
      return;
    }

    setError(null);
    onConfirm(trimmed);
  }, [value, maxLength, onConfirm]);

  const handleCancel = useCallback(() => {
    setValue("");
    setError(null);
    onCancel();
  }, [onCancel]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setError(null);
  }, []);

  const charCountId = "rejection-reason-count";
  const errorId = "rejection-reason-error";

  return (
    <div className="space-y-2" aria-busy={isProcessing}>
      <Label htmlFor="rejection-reason" className="sr-only">
        Powód odrzucenia sugestii AI
      </Label>
      <textarea
        id="rejection-reason"
        value={value}
        onChange={handleChange}
        maxLength={maxLength}
        disabled={isProcessing}
        rows={3}
        placeholder="Dlaczego odrzucasz tę sugestię? (opcjonalnie)"
        className={cn(
          "w-full rounded-md border bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          "border-input",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20"
        )}
        aria-label="Powód odrzucenia sugestii AI"
        aria-describedby={error ? errorId : charCountId}
        aria-invalid={!!error}
      />
      <div id={charCountId} className="text-xs text-muted-foreground" aria-hidden>
        {value.length}/{maxLength}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={handleConfirm}
          disabled={isProcessing || value.trim().length === 0}
          aria-label="Potwierdź odrzucenie sugestii"
        >
          {isProcessing ? "Zapisywanie..." : "Potwierdź odrzucenie"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isProcessing}
          aria-label="Anuluj odrzucenie"
        >
          Anuluj
        </Button>
      </div>
    </div>
  );
}
