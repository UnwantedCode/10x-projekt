import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

/**
 * Supabase client for browser-side usage (React components).
 * Uses PUBLIC_ prefixed environment variables for client-side access.
 */
export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey);
