import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

// サーバー専用。シークレットキーで RLS を迂回するため、ブラウザには絶対に渡さない。
export function db(): SupabaseClient {
  if (client) return client;
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = env();
  client = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
