import type { HeroMetaAnalysis, HeroPopulationStats, HeroTier } from "@/types/tier";

export const HERO_TIER_LABELS: HeroTier[] = ["S", "A", "B", "C", "D"];

export interface HeroBase extends HeroPopulationStats {
  key: string;
  name: string;
  portrait: string;
  role: "tank" | "damage" | "support";
  subrole: string;
  gamemodes: string[];
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function standardDeviation(values: number[], average: number): number {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function zScores(values: number[]): number[] {
  const average = mean(values);
  const deviation = standardDeviation(values, average);
  return values.map((value) => (deviation > 1e-9 ? (value - average) / deviation : 0));
}

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function tierFromPercentile(percentile: number): HeroTier {
  if (percentile >= 0.9) return "S";
  if (percentile >= 0.7) return "A";
  if (percentile >= 0.4) return "B";
  if (percentile >= 0.15) return "C";
  return "D";
}

export function calculateHeroTiers(dataset: HeroBase[]): HeroMetaAnalysis[] {
  if (dataset.length === 0) return [];

  const picks = dataset.map((hero) => Math.max(0, hero.pickrate));
  const wins = dataset.map((hero) => hero.winrate);
  const bans = dataset.map((hero) => Math.max(0, hero.banrate ?? 0));
  const zPick = zScores(picks);
  const zWin = zScores(wins);
  const zBan = zScores(bans);

  const scored = dataset.map((hero, index) => {
    const pickReliability = Math.sqrt(picks[index] / (picks[index] + 5));
    const scaledPick = picks[index] * pickReliability;
    const rawMetaScore = sigmoid(zWin[index]) * Math.log1p(scaledPick) - zBan[index] * 0.15;
    return {
      ...hero,
      zPick: zPick[index],
      zWin: zWin[index],
      zBan: hero.banrate === null ? 0 : zBan[index],
      scaledPick,
      rawMetaScore,
      metaScore: 0,
      tier: "D" as HeroTier,
      rank: 0,
    };
  });

  const scoreZ = zScores(scored.map((hero) => hero.rawMetaScore));
  scored.forEach((hero, index) => {
    hero.metaScore = Math.round(sigmoid(scoreZ[index] * 1.35) * 1000) / 10;
  });

  const ordered = [...scored].sort(
    (first, second) => second.rawMetaScore - first.rawMetaScore || first.name.localeCompare(second.name),
  );
  ordered.forEach((hero, index) => {
    hero.rank = index + 1;
    hero.tier = tierFromPercentile((ordered.length - index) / ordered.length);
  });

  return ordered;
}

export function blendCommunityVotes(
  heroes: HeroMetaAnalysis[],
  votes: Array<{ heroKey: string; averagePoints: number; count: number }>,
): HeroMetaAnalysis[] {
  const voteByKey = new Map(votes.map((vote) => [vote.heroKey, vote]));
  const blended = heroes.map((hero) => {
    const vote = voteByKey.get(hero.key);
    const communityScore = vote ? ((vote.averagePoints - 1) / 4) * 100 : null;
    const confidence = vote ? vote.count / (vote.count + 20) : 0;
    const adjustedScore = communityScore === null
      ? hero.metaScore
      : hero.metaScore * (1 - confidence * 0.25) + communityScore * confidence * 0.25;
    return { ...hero, metaScore: Math.round(adjustedScore * 10) / 10, communityScore, communityVoteCount: vote?.count ?? 0 };
  }).sort((first, second) => second.metaScore - first.metaScore || first.name.localeCompare(second.name));
  blended.forEach((hero, index) => {
    hero.rank = index + 1;
    hero.tier = tierFromPercentile((blended.length - index) / blended.length);
    const averagePoints = voteByKey.get(hero.key)?.averagePoints;
    hero.communityTier = averagePoints === undefined
      ? null
      : averagePoints >= 4.5 ? "S" : averagePoints >= 3.5 ? "A" : averagePoints >= 2.5 ? "B" : averagePoints >= 1.5 ? "C" : "D";
  });
  return blended;
}
