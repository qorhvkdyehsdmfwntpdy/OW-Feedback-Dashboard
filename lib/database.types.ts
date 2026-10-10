export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      squad_teams: {
        Row: {
          id: string;
          name: string;
          battle_tags: Json;
          gamemode: "competitive" | "quickplay";
          owner_tag: string | null;
          owner_id: string;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          battle_tags: Json;
          gamemode?: "competitive" | "quickplay";
          owner_tag?: string | null;
          owner_id: string;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          battle_tags?: Json;
          gamemode?: "competitive" | "quickplay";
          owner_tag?: string | null;
          owner_id?: string;
          is_public?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      hero_votes: {
        Row: {
          id: string;
          hero_key: string;
          voter_id: string;
          user_id: string;
          tier: "S" | "A" | "B" | "C" | "D";
          comment: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          hero_key: string;
          voter_id: string;
          user_id: string;
          tier: "S" | "A" | "B" | "C" | "D";
          comment?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          hero_key?: string;
          voter_id?: string;
          user_id?: string;
          tier?: "S" | "A" | "B" | "C" | "D";
          comment?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lfg_posts: {
        Row: {
          id: string;
          author_tag: string;
          author_id: string;
          title: string;
          description: string;
          role: "tank" | "damage" | "support" | "any";
          rank: "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";
          gamemode: "competitive" | "quickplay";
          status: "open" | "closed";
          applicants: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_tag: string;
          author_id: string;
          title: string;
          description?: string;
          role: "tank" | "damage" | "support" | "any";
          rank: "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";
          gamemode?: "competitive" | "quickplay";
          status?: "open" | "closed";
          applicants?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_tag?: string;
          author_id?: string;
          title?: string;
          description?: string;
          role?: "tank" | "damage" | "support" | "any";
          rank?: "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";
          gamemode?: "competitive" | "quickplay";
          status?: "open" | "closed";
          applicants?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
