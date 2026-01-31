import { useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useLoginForm } from "./useLoginForm";

export function LoginForm() {
  const { values, errors, isSubmitting, handleChange, handleBlur, handleSubmit } = useLoginForm();

  const emailId = useId();
  const passwordId = useId();

  return (
    <div className="w-full space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Zaloguj się</h1>
        <p className="text-muted-foreground text-sm">Wprowadź swoje dane, aby uzyskać dostęp do konta</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

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

        <div className="space-y-2">
          <Label htmlFor={passwordId}>Hasło</Label>
          <Input
            id={passwordId}
            name="password"
            type="password"
            placeholder="Wprowadź hasło"
            autoComplete="current-password"
            value={values.password}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? `${passwordId}-error` : undefined}
            disabled={isSubmitting}
          />
          {errors.password && (
            <p id={`${passwordId}-error`} className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Logowanie..." : "Zaloguj się"}
        </Button>
      </form>

      <div className="space-y-2 text-center text-sm">
        <p>
          <a href="/forgot-password" className="text-primary hover:underline">
            Zapomniałeś hasła?
          </a>
        </p>
        <p className="text-muted-foreground">
          Nie masz jeszcze konta?{" "}
          <a href="/register" className="text-primary hover:underline">
            Zarejestruj się
          </a>
        </p>
      </div>
    </div>
  );
}
