import { createClient } from "@supabase/supabase-js";

const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || "").trim();
const supabaseAnonKey = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""
).trim();

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const fallbackSupabaseUrl = "https://invalid-project.supabase.co";
const fallbackSupabaseAnonKey = "invalid-anon-key";

if (!hasSupabaseConfig) {
  console.error(
    "[CRM Vendas] Variaveis do Supabase ausentes. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou VITE_SUPABASE_PUBLISHABLE_KEY)."
  );
}

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : fallbackSupabaseUrl,
  hasSupabaseConfig ? supabaseAnonKey : fallbackSupabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
