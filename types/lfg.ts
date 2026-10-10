export type LfgPurpose = "scrim" | "competitive" | "quickplay";
export type LfgPosition = "tank" | "damage" | "healer" | "support" | "any";
export type LfgRank = "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";

export interface LfgPost {
  id: string;
  authorNickname: string;
  authorBattleTag: string;
  title: string;
  description: string;
  purpose: LfgPurpose;
  position: LfgPosition;
  targetTier: LfgRank;
  currentMembers: number;
  totalMembers: number;
  discordId: string | null;
  contactBattleTag: string;
  createdAt: string;
  isOpen: boolean;
  applicantCount: number;
  isAuthor: boolean;
  hasApplied: boolean;
}

export interface CreateLfgPostInput {
  authorNickname: string;
  authorBattleTag: string;
  purpose: LfgPurpose;
  position: Exclude<LfgPosition, "any">;
  targetTier: LfgRank;
  totalMembers: number;
  discordId: string;
  contactBattleTag: string;
}
