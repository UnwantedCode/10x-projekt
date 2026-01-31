import { useState, useCallback } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { AISuggestionDTO, TaskPriority } from "@/types";
import { PRIORITY_CONFIGS } from "./types";
import { RejectionReasonInput } from "./RejectionReasonInput";

// =============================================================================
// Types
// =============================================================================

export interface AISuggestionPanelProps {
  suggestion: AISuggestionDTO;
  currentPriority: TaskPriority | null;
  onAccept: () => void;
  onModify: (priority: TaskPriority) => void;
  onReject: (reason: string) => void;
  isProcessing: boolean;
}

const PRIORITIES: TaskPriority[] = [3, 2, 1];

// =============================================================================
// Component
// =============================================================================

export function AISuggestionPanel({ suggestion, onAccept, onModify, onReject, isProcessing }: AISuggestionPanelProps) {
  const [showRejectInput, setShowRejectInput] = useState(false);

  const suggestedPriority = suggestion.suggestedPriority as TaskPriority;
  const priorityConfig = PRIORITY_CONFIGS[suggestedPriority];
  const otherPriorities = PRIORITIES.filter((p) => p !== suggestedPriority);

  const handleRejectConfirm = useCallback(
    (reason: string) => {
      onReject(reason);
      setShowRejectInput(false);
    },
    [onReject]
  );

  const handleRejectCancel = useCallback(() => {
    setShowRejectInput(false);
  }, []);

  return (
    <Card
      className="border-border/50 bg-muted/30 py-3"
      role="status"
      aria-live="polite"
      aria-label="Sugestia priorytetu AI"
    >
      <CardContent className="flex flex-col gap-3 px-4 py-0">
        {/* Badge sugerowanego priorytetu */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={`shrink-0 text-xs ${priorityConfig.color} ${priorityConfig.bgColor}`}>
            {priorityConfig.label}
          </Badge>
          {suggestion.justificationTags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {suggestion.justificationTags.map((tag) => (
                <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Uzasadnienie */}
        {suggestion.justification && <p className="text-sm text-muted-foreground">{suggestion.justification}</p>}

        {/* Akcje */}
        {!showRejectInput ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onAccept}
              disabled={isProcessing}
              aria-label="Akceptuj sugestię priorytetu"
            >
              Akceptuj
            </Button>

            {otherPriorities.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProcessing}
                    aria-label="Modyfikuj priorytet"
                    aria-haspopup="listbox"
                  >
                    Modyfikuj
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" role="listbox">
                  {otherPriorities.map((p) => {
                    const config = PRIORITY_CONFIGS[p];
                    return (
                      <DropdownMenuItem key={p} onSelect={() => onModify(p)} className={config.color} role="option">
                        {config.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowRejectInput(true)}
              disabled={isProcessing}
              aria-label="Odrzuć sugestię"
            >
              Odrzuć
            </Button>
          </div>
        ) : (
          <RejectionReasonInput
            onConfirm={handleRejectConfirm}
            onCancel={handleRejectCancel}
            isProcessing={isProcessing}
            maxLength={300}
          />
        )}
      </CardContent>
    </Card>
  );
}
