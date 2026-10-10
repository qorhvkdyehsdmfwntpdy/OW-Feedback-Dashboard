import type { RoleKey } from "@/lib/types";

export type HeroTier = "S" | "A" | "B" | "C" | "D";
export type MetaGamemode = "competitive" | "quickplay";
export type MetaPlatform = "pc" | "console";
export type MetaRegion = "americas" | "europe" | "asia";

export interface HeroCatalogItem {
  key: string;
  name: string;
  portrait: string;
  role: RoleKey;
  subrole: string;
  gamemodes: string[];
}

export interface HeroPopulationStats {
  hero: string;
  pickrate: number;
  winrate: number;
  banrate: number | null;
}

export interface HeroMetaAnalysis extends HeroCatalogItem, HeroPopulationStats {
  zPick: number;
  zWin: number;
  zBan: number;
  scaledPick: number;
  rawMetaScore: number;
  metaScore: number;
  tier: HeroTier;
  rank: number;
  communityScore?: number | null;
  communityVoteCount?: number;
  communityTier?: HeroTier | null;
}

export interface HeroMetaDataset {
  heroes: HeroMetaAnalysis[];
  mode: MetaGamemode;
  platform: MetaPlatform;
  region: MetaRegion;
  fetchedAt: string;
  source: "overfast";
  communityVotesEnabled?: boolean;
}

export interface HeroUsage {
  heroKey: string;
  timePlayedSeconds: number;
  gamesPlayed: number;
  winrate: number;
}

export interface PlayerMetaPick {
  playerId: string;
  username: string;
  role: RoleKey;
  hero: HeroMetaAnalysis | null;
  personalWinrate: number | null;
  recommendation: HeroMetaAnalysis | null;
}

export interface HeroCounterPair {
  heroKey: string;
  counterKey: string;
  score: number;
  reason: string;
}

export interface SquadSynergyAnalysis {
  metaFitScore: number;
  rosterCoverageScore: number;
  relationshipScore: number;
  picks: PlayerMetaPick[];
  synergyPairs: Array<{ first: string; second: string; reason: string; score: number }>;
  counterPairs: Array<{ hero: string; counter: string; reason: string; score: number }>;
  summary: string;
  recommendations: string[];
}
