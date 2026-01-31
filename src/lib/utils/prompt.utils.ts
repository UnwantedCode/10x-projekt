import { createHash } from "crypto";

/**
 * Sanitizes text before including in AI prompt.
 * Protects against prompt injection attacks.
 */
export function sanitizePromptInput(text: string, options: { maxLength?: number } = {}): string {
  const maxLength = options.maxLength ?? 1000;

  // Remove control characters (ASCII 0-31 and 127)
  // eslint-disable-next-line no-control-regex
  const controlCharsRegex = /[\x00-\x1F\x7F]/g;

  return text
    .replace(/```/g, "")
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(controlCharsRegex, "")
    .substring(0, maxLength)
    .trim();
}

/**
 * Generates SHA256 hash of prompt for logging/caching purposes.
 * Uses Node.js crypto module for server-side compatibility.
 */
export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex");
}