import { useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

import type { ForgotPasswordFormValues, ForgotPasswordFormErrors, UseForgotPasswordFormReturn } from "./types";

const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates email field
 */
function validateEmail(email: string): string | undefined {
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    return "Adres email jest wymagany";
  }

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return "Podaj poprawny adres email";
  }

  return undefined;
}

/**
 * Custom hook for forgot password form state management and submission
 *
 * Security note: Always shows success message after submission,
 * regardless of whether the email exists. This prevents account enumeration.
 */
export function useForgotPasswordForm(): UseForgotPasswordFormReturn {
  const [values, setValues] = useState<ForgotPasswordFormValues>({
    email: "",
  });
  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;

      setValues({ email: value });

      // Clear error if field was previously touched
      if (isTouched) {
        const emailError = validateEmail(value);
        setErrors({ email: emailError });
      }
    },
    [isTouched]
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { value } = e.target;

    setIsTouched(true);

    const emailError = validateEmail(value);
    setErrors({ email: emailError });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark as touched
      setIsTouched(true);

      // Validate email
      const emailError = validateEmail(values.email);

      if (emailError) {
        setErrors({ email: emailError });
        // Focus email field
        const element = document.querySelector<HTMLInputElement>('input[name="email"]');
        element?.focus();
        return;
      }

      setIsLoading(true);
      setErrors({});

      try {
        await supabase.auth.resetPasswordForEmail(values.email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
      } catch (error) {
        // Intentionally ignore errors - always show success to prevent account enumeration
        console.error("Password reset error:", error);
      } finally {
        setIsLoading(false);
        // Always show success message regardless of API response
        setIsSubmitted(true);
      }
    },
    [values.email]
  );

  return {
    values,
    errors,
    isLoading,
    isSubmitted,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
