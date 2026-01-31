import { useMemo } from "react";

import type { PasswordStrength, PasswordStrengthResult } from "./types";

/**
 * Calculates password strength based on various criteria:
 * - Length (8+ characters)
 * - Contains lowercase letters
 * - Contains uppercase letters
 * - Contains numbers
 * - Contains special characters
 */
function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { strength: "weak", score: 0, label: "Słabe" };
  }

  let score = 0;

  // Length check (8+ characters)
  if (password.length >= 8) {
    score += 1;
  }

  // Contains lowercase letters
  if (/[a-z]/.test(password)) {
    score += 1;
  }

  // Contains uppercase letters
  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  // Contains numbers
  if (/\d/.test(password)) {
    score += 1;
  }

  // Contains special characters
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    score += 1;
  }

  // Map score to strength level
  let strength: PasswordStrength;
  let label: string;

  if (score <= 1) {
    strength = "weak";
    label = "Słabe";
  } else if (score === 2) {
    strength = "fair";
    label = "Przeciętne";
  } else if (score === 3) {
    strength = "good";
    label = "Dobre";
  } else {
    strength = "strong";
    label = "Silne";
  }

  return { strength, score, label };
}

/**
 * Custom hook for calculating password strength
 * Memoizes the result to prevent unnecessary recalculations
 */
export function usePasswordStrength(password: string): PasswordStrengthResult {
  return useMemo(() => calculatePasswordStrength(password), [password]);
}
