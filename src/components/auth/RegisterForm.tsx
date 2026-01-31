import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useRegisterForm } from "./useRegisterForm";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

/**
 * Registration form component with email, password, password confirmation,
 * terms acceptance checkbox, and password strength indicator.
 */
export function RegisterForm() {
  const { values, errors, isSubmitting, handleChange, handleCheckboxChange, handleBlur, handleSubmit } =
    useRegisterForm();

  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const termsId = useId();

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Utwórz konto</h1>
        <p className="text-muted-foreground text-sm">Wprowadź swoje dane, aby utworzyć nowe konto</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {/* Email field */}
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
            aria-describedby={errors.email ? `${emailId}-error` : undefined}
            disabled={isSubmitting}
          />
          {errors.email && (
            <p id={`${emailId}-error`} className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        {/* Password field */}
        <div className="space-y-2">
          <Label htmlFor={passwordId}>Hasło</Label>
          <Input
            id={passwordId}
            name="password"
            type="password"
            placeholder="Minimum 8 znaków"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            disabled={isSubmitting}
          />
          <PasswordStrengthIndicator password={values.password} />
          {errors.password && (
            <p id={`${passwordId}-error`} className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        {/* Confirm password field */}
        <div className="space-y-2">
          <Label htmlFor={confirmPasswordId}>Potwierdź hasło</Label>
          <Input
            id={confirmPasswordId}
            name="confirmPassword"
            type="password"
            placeholder="Powtórz hasło"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? `${confirmPasswordId}-error` : undefined}
            disabled={isSubmitting}
          />
          {errors.confirmPassword && (
            <p id={`${confirmPasswordId}-error`} className="text-sm text-destructive">
              {errors.confirmPassword}
            </p>
          )}
        </div>

        {/* Terms checkbox */}
        <div className="space-y-2">
          <div className="flex items-start space-x-2">
            <Checkbox
              id={termsId}
              checked={values.acceptedTerms}
              onCheckedChange={handleCheckboxChange}
              aria-invalid={!!errors.acceptedTerms}
              aria-describedby={errors.acceptedTerms ? `${termsId}-error` : undefined}
              disabled={isSubmitting}
            />
            <Label htmlFor={termsId} className="text-sm font-normal leading-tight cursor-pointer">
              Akceptuję{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                regulamin
              </a>{" "}
              i{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                politykę prywatności
              </a>
            </Label>
          </div>
          {errors.acceptedTerms && (
            <p id={`${termsId}-error`} className="text-sm text-destructive">
              {errors.acceptedTerms}
            </p>
          )}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Rejestrowanie..." : "Zarejestruj się"}
        </Button>
      </form>

      <div className="text-center text-sm">
        <p className="text-muted-foreground">
          Masz już konto?{" "}
          <a href="/login" className="text-primary hover:underline">
            Zaloguj się
          </a>
        </p>
      </div>
    </div>
  );
}
