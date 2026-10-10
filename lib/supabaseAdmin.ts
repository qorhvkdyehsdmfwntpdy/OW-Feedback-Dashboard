import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

let adminClient: SupabaseClient<Database> | null = null;

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  if (!adminClient) {
    adminClient = createClient<Database>(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return adminClient;
}

export async function getRequestUser(request: Request): Promise<User | null> {
  const client = getSupabaseAdminClient();
  const authorization = request.headers.get("authorization");
  if (!client || !authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7);
  if (token.length < 20 || token.length > 4096) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
