export type RoleKey = "tank" | "damage" | "support";
export type GameMode = "competitive" | "quickplay";

export type RankDivision =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "master"
  | "grandmaster"
  | "champion";

export interface CompetitiveRank {
  division: RankDivision | string;
  tier: number;
  role_icon?: string;
  rank_icon?: string;
  tier_icon?: string;
}

export interface PlayerSummary {
  username: string;
  avatar: string | null;
  namecard: string | null;
  title: string | null;
  endorsement?: {
    level: number;
    frame?: string;
  };
  competitive?: {
    pc?: {
      season?: number;
      tank: CompetitiveRank | null;
      damage: CompetitiveRank | null;
      support: CompetitiveRank | null;
      open?: CompetitiveRank | null;
    } | null;
    console?: {
      season?: number;
      tank: CompetitiveRank | null;
      damage: CompetitiveRank | null;
      support: CompetitiveRank | null;
      open?: CompetitiveRank | null;
    } | null;
  } | null;
  last_updated_at?: number;
}

export interface StatTotals {
  eliminations: number;
  assists: number;
  deaths: number;
  damage: number;
  healing: number;
}

export interface StatAverages {
  eliminations: number;
  assists: number;
  deaths: number;
  damage: number;
  healing: number;
}

export interface RoleOrHeroStats {
  games_played: number;
  games_won: number;
  games_lost: number;
  time_played: number;
  winrate: number;
  kda: number;
  total: StatTotals;
  average: StatAverages;
}

export interface StatsSummary {
  general: RoleOrHeroStats;
  roles: Partial<Record<RoleKey, RoleOrHeroStats>>;
  heroes?: Record<string, RoleOrHeroStats>;
}

export interface OverfastErrorBody {
  error?: string;
  message?: string;
  detail?: string;
}

export type FetchPlayerErrorCode =
  | "not_found"
  | "private"
  | "rate_limited"
  | "network"
  | "unknown";

export class PlayerFetchError extends Error {
  constructor(
    public readonly code: FetchPlayerErrorCode,
    public readonly battleTag: string,
    message: string,
  ) {
    super(message);
    this.name = "PlayerFetchError";
  }
}

export interface NormalizedPlayerStats {
  battleTag: string;
  playerId: string;
  username: string;
  avatar: string | null;
  title: string | null;
  mainRole: RoleKey;
  competitiveRank: CompetitiveRank | null;
  competitiveLabel: string;
  gamesPlayed: number;
  winrate: number;
  kda: number;
  timePlayedSeconds: number;
  deathsPer10min: number;
  damagePer10min: number;
  healingPer10min: number;
  elimsPer10min: number;
  assistsPer10min: number;
  heroUsage: Array<{
    heroKey: string;
    timePlayedSeconds: number;
    gamesPlayed: number;
    winrate: number;
  }>;
  gamemode: GameMode;
}

export type StyleTagKey =
  | "high-risk"
  | "survival"
  | "positioning"
  | "balanced";

export interface StyleTag {
  key: StyleTagKey;
  label: string;
}

export interface CoachingReport {
  tone: "warning" | "excellent" | "neutral";
  headline: string;
  summary: string;
  focus: string[];
}

export interface PlayerAnalysis {
  player: NormalizedPlayerStats;
  survivalScore: number;
  owScore: number;
  styleTag: StyleTag;
  radar: {
    survival: number;
    damage: number;
    healing: number;
    kda: number;
    winrate: number;
  };
  coaching: CoachingReport;
}

export interface SquadPlayerError {
  battleTag: string;
  code: FetchPlayerErrorCode;
  message: string;
}

export interface SquadAnalysisResult {
  analyses: PlayerAnalysis[];
  errors: SquadPlayerError[];
}

export const PLAYER_COLORS = [
  "#f97316",
  "#22d3ee",
  "#a78bfa",
  "#84cc16",
  "#fb7185",
] as const;
