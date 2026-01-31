import type React from "react";

/**
 * Values of login form fields
 */
export interface LoginFormValues {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
}

/**
 * Login form validation errors
 */
export interface LoginFormErrors {
  /** Email field validation error */
  email?: string;
  /** Password field validation error */
  password?: string;
  /** General form error (e.g., server error, invalid credentials) */
  form?: string;
}

/**
 * Return type of useLoginForm hook
 */
export interface UseLoginFormReturn {
  /** Current form values */
  values: LoginFormValues;
  /** Validation errors */
  errors: LoginFormErrors;
  /** Whether form is being submitted */
  isSubmitting: boolean;
  /** Handler for field value changes */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for field blur - validates field */
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Handler for form submission */
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}
