import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { GameMode } from "@/lib/types";

export interface SquadTeam {
  id: string;
  name: string;
  battle_tags: string[];
  gamemode: GameMode;
  owner_tag: string | null;
  owner_id: string;
  is_public: boolean;
  created_at: string;
}

export interface HeroVote {
  id: string;
  hero_key: string;
  voter_id: string;
  user_id: string;
  tier: "S" | "A" | "B" | "C" | "D";
  comment: string;
  created_at: string;
  updated_at: string;
}

export type { LfgPost } from "@/types/lfg";

let browserClient: SupabaseClient<Database> | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!browserClient) {
    browserClient = createClient<Database>(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return browserClient;
}
