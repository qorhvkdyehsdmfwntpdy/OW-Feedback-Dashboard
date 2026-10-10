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
          author_nickname: string;
          author_id: string;
          title: string;
          description: string;
          purpose: "scrim" | "competitive" | "quickplay";
          role: "tank" | "damage" | "healer" | "support" | "any";
          rank: "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";
          gamemode: "competitive" | "quickplay";
          status: "open" | "closed";
          current_members: number;
          total_members: number;
          discord_id: string | null;
          contact_battle_tag: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          author_tag: string;
          author_nickname?: string;
          author_id: string;
          title: string;
          description?: string;
          purpose?: "scrim" | "competitive" | "quickplay";
          role: "tank" | "damage" | "healer" | "support" | "any";
          rank: "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";
          gamemode?: "competitive" | "quickplay";
          status?: "open" | "closed";
          current_members?: number;
          total_members?: number;
          discord_id?: string | null;
          contact_battle_tag?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          author_tag?: string;
          author_nickname?: string;
          author_id?: string;
          title?: string;
          description?: string;
          purpose?: "scrim" | "competitive" | "quickplay";
          role?: "tank" | "damage" | "healer" | "support" | "any";
          rank?: "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";
          gamemode?: "competitive" | "quickplay";
          status?: "open" | "closed";
          current_members?: number;
          total_members?: number;
          discord_id?: string | null;
          contact_battle_tag?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lfg_applications: {
        Row: { post_id: string; user_id: string; applied_at: string };
        Insert: { post_id: string; user_id: string; applied_at?: string };
        Update: { post_id?: string; user_id?: string; applied_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      apply_lfg_post: { Args: { p_post_id: string; p_applicant_id: string }; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
