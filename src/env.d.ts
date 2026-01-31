/// <reference types="astro/client" />

import type { SupabaseClient } from "./db/supabase.client";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      user: {
        id: string;
        email: string | undefined;
      } | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
}

// ImportMeta is augmented by Vite/Astro automatically
declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
