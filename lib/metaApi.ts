import type { HeroCatalogItem, HeroMetaDataset, HeroPopulationStats, MetaGamemode, MetaPlatform, MetaRegion } from "@/types/tier";
import { blendCommunityVotes, calculateHeroTiers, type HeroBase } from "@/lib/tierCalculator";
import { getSupabaseClient } from "@/lib/supabase";

const BASE_URL = (process.env.OVERFAST_API_BASE ?? "https://overfast-api.tekrop.fr").replace(/\/$/u, "");

interface OverFastHero {
  key: string;
  name: string;
  portrait: string;
  role: "tank" | "damage" | "support";
  subrole: string;
  gamemodes: string[];
}

interface OverFastHeroStats {
  hero: string;
  pickrate: number;
  winrate: number;
  banrate?: number | null;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`OverFast returned ${response.status} for hero meta data`);
  return (await response.json()) as T;
}

export async function fetchHeroMeta(options: {
  mode: MetaGamemode;
  platform: MetaPlatform;
  region: MetaRegion;
}): Promise<HeroMetaDataset> {
  const params = new URLSearchParams({
    platform: options.platform,
    gamemode: options.mode,
    region: options.region,
    order_by: "hero:asc",
  });
  const [catalog, stats] = await Promise.all([
    getJson<OverFastHero[]>("/heroes?locale=ko-kr"),
    getJson<OverFastHeroStats[]>(`/heroes/stats?${params.toString()}`),
  ]);

  const catalogByKey = new Map<string, HeroCatalogItem>(catalog.map((hero) => [hero.key, hero]));
  const populations: HeroPopulationStats[] = stats.filter(
    (hero) => Number.isFinite(hero.pickrate) && Number.isFinite(hero.winrate),
  ).map((hero) => ({
    hero: hero.hero,
    pickrate: hero.pickrate,
    winrate: hero.winrate,
    banrate: typeof hero.banrate === "number" ? hero.banrate : null,
  }));

  const dataset: HeroBase[] = populations.flatMap((population) => {
    const hero = catalogByKey.get(population.hero);
    if (!hero) return [];
    return [{ ...hero, ...population }];
  });

  const heroes = calculateHeroTiers(dataset);
  const supabase = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase.rpc("get_hero_vote_rollup");
    if (!error && data) {
      const communityVotes = data.map((vote) => ({ heroKey: vote.hero_key, averagePoints: vote.average_points, count: vote.vote_count }));
      return {
        heroes: blendCommunityVotes(heroes, communityVotes),
        mode: options.mode,
        platform: options.platform,
        region: options.region,
        fetchedAt: new Date().toISOString(),
        source: "overfast" as const,
        communityVotesEnabled: true,
      };
    }
  }
  return {
    heroes,
    mode: options.mode,
    platform: options.platform,
    region: options.region,
    fetchedAt: new Date().toISOString(),
    source: "overfast",
    communityVotesEnabled: false,
  };
}
