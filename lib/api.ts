import {
  PlayerFetchError,
  type FetchPlayerErrorCode,
  type NormalizedPlayerStats,
  type OverfastErrorBody,
  type PlayerSummary,
  type RoleKey,
  type RoleOrHeroStats,
  type StatsSummary,
} from "./types";

export { PlayerFetchError };

const OVERFAST_BASE =
  process.env.OVERFAST_API_BASE ?? "https://overfast-api.tekrop.fr";

export function toPlayerId(battleTag: string): string {
  return battleTag.trim().replaceAll("#", "-");
}

export function toBattleTag(playerId: string): string {
  const idx = playerId.lastIndexOf("-");
  if (idx <= 0) return playerId;
  return `${playerId.slice(0, idx)}#${playerId.slice(idx + 1)}`;
}

function classifyStatus(status: number, body: OverfastErrorBody | null): FetchPlayerErrorCode {
  const text = `${body?.error ?? ""} ${body?.message ?? ""}`.toLowerCase();
  if (status === 429) return "rate_limited";
  if (status === 403 || text.includes("private") || text.includes("hidden")) {
    return "private";
  }
  if (status === 404 || text.includes("not found") || text.includes("unknown player")) {
    return "not_found";
  }
  return "unknown";
}

function publicErrorMessage(code: FetchPlayerErrorCode): string {
  switch (code) {
    case "private":
      return "해당 유저는 비공개 프로필입니다";
    case "not_found":
      return "해당 유저는 비공개 프로필입니다";
    case "rate_limited":
      return "OverFast API 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
    case "network":
      return "전적 API에 연결하지 못했습니다. 네트워크를 확인해 주세요.";
    default:
      return "해당 유저는 비공개 프로필입니다";
  }
}

async function overfastGet<T>(path: string, battleTag: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${OVERFAST_BASE}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch {
    throw new PlayerFetchError("network", battleTag, publicErrorMessage("network"));
  }

  if (!response.ok) {
    let body: OverfastErrorBody | null = null;
    try {
      body = (await response.json()) as OverfastErrorBody;
    } catch {
      body = null;
    }
    const code = classifyStatus(response.status, body);
    throw new PlayerFetchError(code, battleTag, publicErrorMessage(code));
  }

  return (await response.json()) as T;
}

function pickMainRole(roles: StatsSummary["roles"]): RoleKey {
  const entries: Array<[RoleKey, number]> = (
    ["tank", "damage", "support"] as const
  ).map((role) => [role, roles[role]?.time_played ?? 0]);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[1] ? entries[0][0] : "damage";
}

function rankLabel(
  rank: NormalizedPlayerStats["competitiveRank"],
  role: RoleKey,
): string {
  if (!rank) return "언랭크";
  const divisionMap: Record<string, string> = {
    bronze: "브론즈",
    silver: "실버",
    gold: "골드",
    platinum: "플래티넘",
    diamond: "다이아",
    master: "마스터",
    grandmaster: "그랜드마스터",
    champion: "챔피언",
  };
  const roleMap: Record<RoleKey, string> = {
    tank: "탱커",
    damage: "딜러",
    support: "지원",
  };
  const division = divisionMap[rank.division] ?? rank.division;
  return `${roleMap[role]} ${division} ${rank.tier}`;
}

function pickCompetitiveRank(
  summary: PlayerSummary,
  mainRole: RoleKey,
): NormalizedPlayerStats["competitiveRank"] {
  const ladder = summary.competitive?.pc ?? summary.competitive?.console;
  if (!ladder) return null;
  const preferred = ladder[mainRole];
  if (preferred) return preferred;
  return ladder.tank ?? ladder.damage ?? ladder.support ?? ladder.open ?? null;
}

function hasMeaningfulStats(stats: RoleOrHeroStats | undefined): boolean {
  return Boolean(stats && stats.games_played > 0 && stats.time_played > 0);
}

function toNormalized(
  battleTag: string,
  playerId: string,
  summary: PlayerSummary,
  stats: StatsSummary,
  gamemode: NormalizedPlayerStats["gamemode"],
): NormalizedPlayerStats {
  const mainRole = pickMainRole(stats.roles);
  const roleStats = stats.roles[mainRole];
  const source = hasMeaningfulStats(roleStats) ? roleStats! : stats.general;
  const competitiveRank = pickCompetitiveRank(summary, mainRole);

  return {
    battleTag,
    playerId,
    username: summary.username || toBattleTag(playerId).split("#")[0],
    avatar: summary.avatar,
    title: summary.title,
    mainRole,
    competitiveRank,
    competitiveLabel: rankLabel(competitiveRank, mainRole),
    gamesPlayed: source.games_played,
    winrate: source.winrate,
    kda: source.kda,
    timePlayedSeconds: source.time_played,
    deathsPer10min: source.average.deaths,
    damagePer10min: source.average.damage,
    healingPer10min: source.average.healing,
    elimsPer10min: source.average.eliminations,
    assistsPer10min: source.average.assists,
    gamemode,
  };
}

export async function fetchPlayerStats(battleTag: string): Promise<NormalizedPlayerStats> {
  const trimmed = battleTag.trim();
  if (!trimmed.includes("#") && !trimmed.includes("-")) {
    throw new PlayerFetchError(
      "unknown",
      trimmed,
      "배틀태그는 Player#1234 형식으로 입력해 주세요.",
    );
  }

  const playerId = toPlayerId(trimmed);
  const displayTag = trimmed.includes("#") ? trimmed : toBattleTag(playerId);
  const encoded = encodeURIComponent(playerId);

  const summary = await overfastGet<PlayerSummary>(
    `/players/${encoded}/summary`,
    displayTag,
  );

  const competitive = await overfastGet<StatsSummary>(
    `/players/${encoded}/stats/summary?gamemode=competitive`,
    displayTag,
  );

  if (hasMeaningfulStats(competitive.general)) {
    return toNormalized(displayTag, playerId, summary, competitive, "competitive");
  }

  const allModes = await overfastGet<StatsSummary>(
    `/players/${encoded}/stats/summary`,
    displayTag,
  );

  if (!hasMeaningfulStats(allModes.general)) {
    throw new PlayerFetchError(
      "private",
      displayTag,
      "해당 유저는 비공개 프로필입니다",
    );
  }

  return toNormalized(displayTag, playerId, summary, allModes, "all-modes");
}

export async function fetchSquadStats(battleTags: string[]): Promise<{
  players: NormalizedPlayerStats[];
  errors: Array<{ battleTag: string; code: FetchPlayerErrorCode; message: string }>;
}> {
  const unique = battleTags
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  const settled = await Promise.allSettled(unique.map((tag) => fetchPlayerStats(tag)));

  const players: NormalizedPlayerStats[] = [];
  const errors: Array<{
    battleTag: string;
    code: FetchPlayerErrorCode;
    message: string;
  }> = [];

  settled.forEach((result, index) => {
    if (result.status === "fulfilled") {
      players.push(result.value);
      return;
    }

    const tag = unique[index];
    if (result.reason instanceof PlayerFetchError) {
      errors.push({
        battleTag: result.reason.battleTag,
        code: result.reason.code,
        message: result.reason.message,
      });
      return;
    }

    errors.push({
      battleTag: tag,
      code: "unknown",
      message: "해당 유저는 비공개 프로필입니다",
    });
  });

  return { players, errors };
}
