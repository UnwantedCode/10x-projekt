import { useState, useCallback } from "react";

import type { LoginFormValues, LoginFormErrors, UseLoginFormReturn } from "./types";

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
          emailNotConfirmed: undefined, // Clear email not confirmed error
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
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrors({
            form: data.error,
            emailNotConfirmed: data.code === "EMAIL_NOT_CONFIRMED",
          });
          return;
        }

        // Przekierowanie - użyj tylko redirectTo
        const params = new URLSearchParams(window.location.search);
        const redirectTo = params.get("redirectTo") || data.redirectTo || "/app";
        window.location.href = redirectTo;
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
