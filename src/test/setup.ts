import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock import.meta.env for Astro
vi.stubGlobal("import.meta", {
  env: {
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_KEY: "test-anon-key",
    PROD: false,
    DEV: true,
  },
});
