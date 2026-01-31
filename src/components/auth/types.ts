import type React from "react";

// =============================================================================
// Login Form Types
// =============================================================================

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

// =============================================================================
// Register Form Types
// =============================================================================

/**
 * Values of register form fields
 */
export interface RegisterFormValues {
  /** User's email address */
  email: string;
  /** User's password */
  password: string;
  /** Password confirmation */
  confirmPassword: string;
  /** Whether terms are accepted */
  acceptedTerms: boolean;
}

/**
 * Register form validation errors
 */
export interface RegisterFormErrors {
  /** Email field validation error */
  email?: string;
  /** Password field validation error */
  password?: string;
  /** Confirm password field validation error */
  confirmPassword?: string;
  /** Terms acceptance error */
  acceptedTerms?: string;
  /** General form error (e.g., server error) */
  form?: string;
}

/**
 * Return type of useRegisterForm hook
 */
export interface UseRegisterFormReturn {
  /** Current form values */
  values: RegisterFormValues;
  /** Validation errors */
  errors: RegisterFormErrors;
  /** Whether form is being submitted */
  isSubmitting: boolean;
  /** Handler for input field value changes */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for checkbox changes */
  handleCheckboxChange: (checked: boolean) => void;
  /** Handler for field blur - validates field */
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Handler for form submission */
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

// =============================================================================
// Password Strength Types
// =============================================================================

/**
 * Password strength level
 */
export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/**
 * Result of password strength calculation
 */
export interface PasswordStrengthResult {
  /** Strength level */
  strength: PasswordStrength;
  /** Numeric score (0-4) */
  score: number;
  /** Human-readable label in Polish */
  label: string;
}
