import { useState, useCallback } from "react";
import type { AuthError } from "@supabase/supabase-js";

import { supabaseBrowser } from "@/db/supabase.browser";

import type { RegisterFormValues, RegisterFormErrors, UseRegisterFormReturn } from "./types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

type RegisterFormField = keyof Omit<RegisterFormValues, "acceptedTerms">;

/**
 * Validates a single form field
 */
function validateField(name: RegisterFormField, value: string, allValues?: RegisterFormValues): string | undefined {
  if (name === "email") {
    if (!value.trim()) {
      return "Email jest wymagany";
    }
    if (!EMAIL_REGEX.test(value)) {
      return "Podaj poprawny adres email";
    }
    return undefined;
  }

  if (name === "password") {
    if (!value) {
      return "Hasło jest wymagane";
    }
    if (value.length < MIN_PASSWORD_LENGTH) {
      return `Hasło musi mieć minimum ${MIN_PASSWORD_LENGTH} znaków`;
    }
    return undefined;
  }

  if (name === "confirmPassword") {
    if (!value) {
      return "Potwierdzenie hasła jest wymagane";
    }
    if (allValues && value !== allValues.password) {
      return "Hasła muszą być identyczne";
    }
    return undefined;
  }

  return undefined;
}

/**
 * Validates entire form and returns all errors
 */
function validateForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  const emailError = validateField("email", values.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validateField("password", values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const confirmPasswordError = validateField("confirmPassword", values.confirmPassword, values);
  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }

  if (!values.acceptedTerms) {
    errors.acceptedTerms = "Musisz zaakceptować regulamin";
  }

  return errors;
}

/**
 * Maps Supabase auth errors to user-friendly messages in Polish
 */
function mapAuthError(error: AuthError): string {
  const message = error.message.toLowerCase();

  if (message.includes("user already registered") || message.includes("already exists")) {
    return "Konto z tym adresem email już istnieje";
  }
  if (message.includes("invalid email")) {
    return "Podany adres email jest nieprawidłowy";
  }
  if (message.includes("password") && message.includes("weak")) {
    return "Hasło jest zbyt słabe";
  }
  if (message.includes("signups not allowed") || message.includes("signup disabled")) {
    return "Rejestracja jest obecnie wyłączona";
  }

  return "Wystąpił błąd podczas rejestracji. Spróbuj ponownie.";
}

/**
 * Custom hook for register form state management and submission
 */
export function useRegisterForm(): UseRegisterFormReturn {
  const [values, setValues] = useState<RegisterFormValues>({
    email: "",
    password: "",
    confirmPassword: "",
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<RegisterFormField>>(new Set());

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      const fieldName = name as RegisterFormField;

      setValues((prev) => {
        const newValues = { ...prev, [fieldName]: value };

        // Validate field if it was previously touched
        if (touchedFields.has(fieldName)) {
          const fieldError = validateField(fieldName, value, newValues);
          setErrors((prevErrors) => ({
            ...prevErrors,
            [fieldName]: fieldError,
            form: undefined,
          }));
        }

        // Real-time validation for confirmPassword when password changes
        if (fieldName === "password" && touchedFields.has("confirmPassword")) {
          const confirmError = validateField("confirmPassword", newValues.confirmPassword, newValues);
          setErrors((prevErrors) => ({
            ...prevErrors,
            confirmPassword: confirmError,
          }));
        }

        return newValues;
      });
    },
    [touchedFields]
  );

  const handleCheckboxChange = useCallback((checked: boolean) => {
    setValues((prev) => ({ ...prev, acceptedTerms: checked }));
    setErrors((prev) => ({ ...prev, acceptedTerms: undefined, form: undefined }));
  }, []);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const fieldName = name as RegisterFormField;

    setTouchedFields((prev) => new Set(prev).add(fieldName));

    setValues((currentValues) => {
      const fieldError = validateField(fieldName, value, currentValues);
      setErrors((prev) => ({ ...prev, [fieldName]: fieldError }));
      return currentValues;
    });
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouchedFields(new Set(["email", "password", "confirmPassword"]));

      // Validate all fields
      const formErrors = validateForm(values);

      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        // Focus first field with error
        const errorOrder: (keyof RegisterFormErrors)[] = ["email", "password", "confirmPassword", "acceptedTerms"];
        const firstErrorField = errorOrder.find((field) => formErrors[field]);
        if (firstErrorField && firstErrorField !== "acceptedTerms") {
          const element = document.querySelector<HTMLInputElement>(`input[name="${firstErrorField}"]`);
          element?.focus();
        }
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        const { error } = await supabaseBrowser.auth.signUp({
          email: values.email,
          password: values.password,
        });

        if (error) {
          setErrors({ form: mapAuthError(error) });
          return;
        }

        // Success - redirect to login with success message
        window.location.href = "/login?registered=true";
      } catch {
        setErrors({ form: "Brak połączenia z serwerem. Sprawdź połączenie internetowe i spróbuj ponownie." });
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
    handleCheckboxChange,
    handleBlur,
    handleSubmit,
  };
}
