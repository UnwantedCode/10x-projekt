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
  /** Flag indicating email not confirmed error */
  emailNotConfirmed?: boolean;
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

// =============================================================================
// Forgot Password Form Types
// =============================================================================

/**
 * Values of forgot password form fields
 */
export interface ForgotPasswordFormValues {
  /** User's email address */
  email: string;
}

/**
 * Forgot password form validation errors
 */
export interface ForgotPasswordFormErrors {
  /** Email field validation error */
  email?: string;
}

/**
 * State of the forgot password form
 */
export interface ForgotPasswordFormState {
  /** Whether form is being submitted */
  isLoading: boolean;
  /** Whether form has been submitted successfully */
  isSubmitted: boolean;
}

/**
 * Return type of useForgotPasswordForm hook
 */
export interface UseForgotPasswordFormReturn {
  /** Current form values */
  values: ForgotPasswordFormValues;
  /** Validation errors */
  errors: ForgotPasswordFormErrors;
  /** Whether form is being submitted */
  isLoading: boolean;
  /** Whether form has been submitted */
  isSubmitted: boolean;
  /** Handler for field value changes */
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Handler for field blur - validates field */
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** Handler for form submission */
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}
