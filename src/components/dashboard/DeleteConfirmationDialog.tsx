import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// =============================================================================
// Types
// =============================================================================

export type DeleteItemType = "task" | "list";

export interface DeleteConfirmationDialogProps {
  /** Czy modal jest otwarty */
  open: boolean;
  /** Callback wywoływany przy zmianie stanu otwarcia */
  onOpenChange: (open: boolean) => void;
  /** Typ usuwanego elementu */
  itemType: DeleteItemType;
  /** Nazwa usuwanego elementu (do wyświetlenia w komunikacie) */
  itemName: string;
  /** Callback wywoływany po potwierdzeniu usunięcia */
  onConfirm: () => void | Promise<void>;
  /** Czy trwa operacja usuwania */
  isDeleting: boolean;
  /** Komunikat błędu wyświetlany w modalu */
  error?: string | null;
}

// =============================================================================
// Helpers
// =============================================================================

function getDescription(itemType: DeleteItemType, itemName: string): string {
  if (itemType === "task") {
    const questionPart = itemName?.trim() ? `„${itemName}"` : "(bez tytułu)";
    return `Czy na pewno chcesz usunąć zadanie ${questionPart}? Tej operacji nie można cofnąć.`;
  }
  const listPart = itemName?.trim() ? `„${itemName}"` : "tę listę";
  return `Czy na pewno chcesz usunąć listę ${listPart}? Wszystkie zadania na tej liście również zostaną usunięte.`;
}

// =============================================================================
// Component
// =============================================================================

export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  itemType,
  itemName,
  onConfirm,
  isDeleting,
  error = null,
}: DeleteConfirmationDialogProps) {
  const description = getDescription(itemType, itemName);
  const descriptionId = `delete-confirm-description-${itemType}`;

  const handleConfirm = () => {
    void Promise.resolve(onConfirm());
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent aria-describedby={descriptionId}>
        <AlertDialogHeader>
          <AlertDialogTitle>Potwierdzenie usunięcia</AlertDialogTitle>
          <AlertDialogDescription id={descriptionId}>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isDeleting}
          >
            {isDeleting ? "Usuwanie..." : "Usuń"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
