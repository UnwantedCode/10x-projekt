import { useId } from "react";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useForgotPasswordForm } from "./useForgotPasswordForm";

/**
 * Success message component displayed after form submission.
 * Always shown regardless of whether the email exists in the system
 * to prevent account enumeration attacks.
 */
function SuccessMessage() {
  return (
    <div className="w-full space-y-6 text-center" role="alert" aria-live="polite">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle className="h-8 w-8 text-green-600" aria-hidden="true" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Sprawdź swoją skrzynkę</h2>
        <p className="text-muted-foreground text-sm">
          Jeśli konto z podanym adresem email istnieje, wyślemy link do resetowania hasła.
        </p>
      </div>

      <a href="/login" className="text-primary hover:underline inline-block text-sm font-medium">
        Wróć do logowania
      </a>
    </div>
  );
}

/**
 * Forgot password form component.
 * Allows users to request a password reset link via email.
 */
export function ForgotPasswordForm() {
  const { values, errors, isLoading, isSubmitted, handleChange, handleBlur, handleSubmit } = useForgotPasswordForm();

  const emailId = useId();
  const errorId = `${emailId}-error`;

  // Show success message after form submission
  if (isSubmitted) {
    return <SuccessMessage />;
  }

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Resetowanie hasła</h1>
        <p className="text-muted-foreground text-sm">Podaj adres email, aby otrzymać link do resetowania hasła</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor={emailId}>Email</Label>
          <Input
            id={emailId}
            name="email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={values.email}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? errorId : undefined}
            disabled={isLoading}
          />
          {errors.email && (
            <p id={errorId} className="text-sm text-destructive" aria-live="polite">
              {errors.email}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Wysyłanie..." : "Wyślij link resetujący"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <a href="/login" className="text-primary hover:underline">
          Wróć do logowania
        </a>
      </div>
    </div>
  );
}
