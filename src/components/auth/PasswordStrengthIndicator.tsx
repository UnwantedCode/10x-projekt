import { usePasswordStrength } from "./usePasswordStrength";

interface PasswordStrengthIndicatorProps {
  /** Password to evaluate */
  password: string;
}

/**
 * Visual indicator showing password strength with 4 segments and a text label.
 * Colors range from red (weak) through yellow (fair) to green (strong).
 */
export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { strength, score, label } = usePasswordStrength(password);

  // Don't render if password is empty
  if (!password) {
    return null;
  }

  // Determine active segments (1-4 based on score)
  const activeSegments = Math.max(1, Math.min(4, score));

  // Color mapping based on strength
  const colorClasses: Record<typeof strength, string> = {
    weak: "bg-red-500",
    fair: "bg-yellow-500",
    good: "bg-lime-500",
    strong: "bg-green-500",
  };

  const textColorClasses: Record<typeof strength, string> = {
    weak: "text-red-600",
    fair: "text-yellow-600",
    good: "text-lime-600",
    strong: "text-green-600",
  };

  return (
    <div className="space-y-1.5" aria-live="polite" aria-atomic="true">
      {/* Strength bar segments */}
      <div className="flex gap-1" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={4}>
        {[1, 2, 3, 4].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              segment <= activeSegments ? colorClasses[strength] : "bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Strength label */}
      <p className={`text-xs font-medium ${textColorClasses[strength]}`}>Siła hasła: {label}</p>
    </div>
  );
}
