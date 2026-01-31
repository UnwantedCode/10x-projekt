import { useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

import type { LoginFormValues, LoginFormErrors, UseLoginFormReturn } from "./types";

const supabase = createClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Validates a single form field
 */
function validateField(name: keyof LoginFormValues, value: string): string | undefined {
  if (name === "email") {
    if (!value.trim()) {
      return "Adres email jest wymagany";
    }
    if (!EMAIL_REGEX.test(value)) {
      return "Nieprawidłowy format adresu email";
    }
    return undefined;
  }

  if (name === "password") {
    if (!value) {
      return "Hasło jest wymagane";
    }
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków`;
    }
    return undefined;
  }

  return undefined;
}

/**
 * Validates entire form and returns all errors
 */
function validateForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  const emailError = validateField("email", values.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validateField("password", values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

/**
 * Maps Supabase auth errors to user-friendly messages
 */
function mapAuthError(errorMessage: string): string {
  if (errorMessage.includes("Email not confirmed")) {
    return "Adres email nie został potwierdzony. Sprawdź swoją skrzynkę.";
  }
  // Generic message for all other auth errors (prevents user enumeration)
  return "Nieprawidłowy email lub hasło";
}

/**
 * Custom hook for login form state management and submission
 */
export function useLoginForm(): UseLoginFormReturn {
  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<keyof LoginFormValues>>(new Set());

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const fieldName = name as keyof LoginFormValues;

      setValues((prev) => ({ ...prev, [fieldName]: value }));

      // Clear field error if the field was previously touched
      if (touchedFields.has(fieldName)) {
        const fieldError = validateField(fieldName, value);
        setErrors((prev) => ({
          ...prev,
          [fieldName]: fieldError,
          form: undefined, // Clear form error on input change
        }));
      }
    },
    [touchedFields]
  );

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as keyof LoginFormValues;

    setTouchedFields((prev) => new Set(prev).add(fieldName));

    const fieldError = validateField(fieldName, value);
    setErrors((prev) => ({ ...prev, [fieldName]: fieldError }));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouchedFields(new Set(["email", "password"]));

      // Validate all fields
      const formErrors = validateForm(values);

      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        // Focus first field with error
        const firstErrorField = formErrors.email ? "email" : "password";
        const element = document.querySelector<HTMLInputElement>(`input[name="${firstErrorField}"]`);
        element?.focus();
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });

        if (error) {
          setErrors({ form: mapAuthError(error.message) });
          return;
        }

        if (data.session) {
          // Check for redirectTo parameter
          const params = new URLSearchParams(window.location.search);
          const redirectTo = params.get("redirect") || params.get("redirectTo") || "/app";
          window.location.href = redirectTo;
        }
      } catch {
        setErrors({ form: "Błąd połączenia z serwerem. Spróbuj ponownie." });
      } finally {
        setIsSubmitting(false);
      }
    },
    [values]
  );

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
  };
}
