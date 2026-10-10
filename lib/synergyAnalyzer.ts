import type { PlayerAnalysis, RoleKey } from "@/lib/types";
import type { HeroMetaAnalysis, SquadSynergyAnalysis } from "@/types/tier";

const ROLE_LABEL: Record<RoleKey, string> = {
  tank: "탱커",
  damage: "딜러",
  support: "지원가",
};

const SYNERGY_LINKS: Record<string, Record<string, string>> = {
  winston: { tracer: "윈스턴의 진입 타이밍에 트레이서가 후방 압박을 더할 수 있습니다.", genji: "윈스턴 진입과 겐지의 다이브 각이 맞으면 같은 대상을 빠르게 압박할 수 있습니다." },
  dva: { tracer: "D.Va의 기동성에 트레이서의 측면 압박을 더하는 기동 조합입니다.", pharah: "D.Va가 공중 교전을 보조하고 파라가 원거리 압박을 이어갈 수 있습니다." },
  reinhardt: { lucio: "라인하르트의 근접 진입을 루시우의 속도 증폭으로 보조할 수 있습니다.", mei: "라인하르트의 전선 유지와 메이의 공간 분할이 좁은 지형에서 맞물립니다." },
  zarya: { genji: "자리야의 방벽을 겐지의 진입 순간에 맞추면 교전 지속력을 보완합니다." },
  ana: { genji: "나노 강화와 겐지의 궁극기 연계를 노릴 수 있는 대표 조합입니다." },
  mercy: { pharah: "메르시의 피해 증폭·기동 지원과 파라의 공중 압박이 잘 맞습니다." },
  kiriko: { reinhardt: "키리코의 정화와 궁극기 지원으로 라인하르트의 진입 부담을 줄일 수 있습니다." },
};

const COUNTER_OPTIONS: Record<string, Array<{ key: string; reason: string }>> = {
  winston: [{ key: "reaper", reason: "근거리 화력으로 윈스턴 진입을 압박하는 선택지" }, { key: "bastion", reason: "집중 화력으로 윈스턴의 방벽·체력을 빠르게 압박" }],
  dva: [{ key: "zarya", reason: "방어 매트릭스를 우회하는 광선 공격으로 압박" }, { key: "mei", reason: "빙벽과 둔화로 D.Va의 진입 경로를 제약" }],
  pharah: [{ key: "ashe", reason: "장거리 정밀 사격으로 공중 이동을 견제" }, { key: "soldier-76", reason: "지속적인 hitscan 화력으로 공중을 견제" }],
  widowmaker: [{ key: "winston", reason: "기동성 있는 점프로 저격 위치를 직접 압박" }, { key: "dva", reason: "부스터로 고지대 저격수를 빠르게 압박" }],
  tracer: [{ key: "cassidy", reason: "근거리 제압 능력으로 측면 진입을 억제" }, { key: "brigitte", reason: "근접 보호와 밀쳐내기로 측면 압박을 완화" }],
  genji: [{ key: "moira", reason: "자동 추적 공격으로 기동 회피를 일부 무시" }, { key: "winston", reason: "광역 공격으로 반사에 의존하지 않고 압박" }],
  "wrecking-ball": [{ key: "sombra", reason: "해킹으로 이동기 의존을 끊는 선택지" }, { key: "brigitte", reason: "밀쳐내기와 방어로 진입 후속타를 방해" }],
  mauga: [{ key: "ana", reason: "생체 수류탄으로 회복을 차단해 교전 압박" }, { key: "zarya", reason: "방벽 자원으로 집중 화력을 버티며 대응" }],
};

function round(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

export function analyzeSquadSynergy(
  analyses: PlayerAnalysis[],
  metaHeroes: HeroMetaAnalysis[],
): SquadSynergyAnalysis {
  const byKey = new Map(metaHeroes.map((hero) => [hero.key, hero]));
  const byRole = (role: RoleKey) => metaHeroes
    .filter((hero) => hero.role === role)
    .sort((first, second) => second.metaScore - first.metaScore);

  const picks = analyses.map((analysis) => {
    const player = analysis.player;
    const actualUsage = [...(player.heroUsage ?? [])].sort(
      (first, second) => second.timePlayedSeconds - first.timePlayedSeconds,
    );
    const played = actualUsage.find((usage) => byKey.has(usage.heroKey));
    const hero = played ? byKey.get(played.heroKey) ?? null : null;
    const recommendation = byRole(player.mainRole).find((candidate) => candidate.key !== hero?.key) ?? null;
    return {
      playerId: player.playerId,
      username: player.username,
      role: player.mainRole,
      hero,
      personalWinrate: played?.winrate ?? null,
      recommendation,
    };
  });

  const usablePicks = picks.filter((pick) => pick.hero);
  const metaFitScore = usablePicks.length
    ? round(usablePicks.reduce((sum, pick) => sum + (pick.hero?.metaScore ?? 0), 0) / usablePicks.length)
    : 0;
  const roleCounts = analyses.reduce<Record<RoleKey, number>>(
    (counts, analysis) => ({ ...counts, [analysis.player.mainRole]: counts[analysis.player.mainRole] + 1 }),
    { tank: 0, damage: 0, support: 0 },
  );
  const expectedRoles: Record<RoleKey, number> = { tank: 1, damage: 2, support: 2 };
  const roleDeviation = (Object.keys(expectedRoles) as RoleKey[]).reduce(
    (sum, role) => sum + Math.abs(roleCounts[role] - expectedRoles[role]),
    0,
  );
  const rosterCoverageScore = round(100 - roleDeviation * 12.5);

  const synergyPairs: SquadSynergyAnalysis["synergyPairs"] = [];
  for (let first = 0; first < usablePicks.length; first += 1) {
    for (let second = first + 1; second < usablePicks.length; second += 1) {
      const firstHero = usablePicks[first].hero;
      const secondHero = usablePicks[second].hero;
      if (!firstHero || !secondHero) continue;
      const reason = SYNERGY_LINKS[firstHero.key]?.[secondHero.key]
        ?? SYNERGY_LINKS[secondHero.key]?.[firstHero.key];
      if (reason) {
        const averageMeta = (firstHero.metaScore + secondHero.metaScore) / 2;
        const score = round(72 + (averageMeta - 50) * 0.2);
        synergyPairs.push({ first: firstHero.name, second: secondHero.name, reason, score });
      }
    }
  }

  const counterPairs: SquadSynergyAnalysis["counterPairs"] = [];
  for (const pick of picks) {
    const selectedHero = pick.hero;
    if (!selectedHero) continue;
    for (const option of COUNTER_OPTIONS[selectedHero.key] ?? []) {
      const counter = byKey.get(option.key);
      if (counter) {
        const score = round(70 + (counter.metaScore - selectedHero.metaScore) * 0.2);
        counterPairs.push({ hero: selectedHero.name, counter: counter.name, reason: option.reason, score });
      }
    }
  }

  const averageSynergy = synergyPairs.length
    ? synergyPairs.reduce((sum, pair) => sum + pair.score, 0) / synergyPairs.length
    : 50;
  const averageCounterReadiness = counterPairs.length
    ? counterPairs.reduce((sum, pair) => sum + pair.score, 0) / counterPairs.length
    : 50;
  const relationshipScore = round(
    50 + (averageSynergy - 50) * 0.35 + (averageCounterReadiness - 50) * 0.2 + Math.min(15, synergyPairs.length * 5),
  );
  const highTierCount = usablePicks.filter((pick) => pick.hero?.tier === "S" || pick.hero?.tier === "A").length;
  const missingRoles = (Object.keys(expectedRoles) as RoleKey[])
    .filter((role) => roleCounts[role] < expectedRoles[role])
    .map((role) => ROLE_LABEL[role]);

  let summary: string;
  if (usablePicks.length === 0) {
    summary = "OverFast에서 공개된 영웅별 플레이 시간이 없어 실제 모스트 픽을 확인하지 못했습니다. 공개 프로필·선택 모드 통계를 확인한 뒤 다시 분석해 주세요.";
  } else if (missingRoles.length > 0) {
    summary = `확인된 모스트 픽 중 S/A 티어 영웅은 ${highTierCount}명이며, 표준 1-2-2 역할 구성을 기준으로 ${missingRoles.join("·")} 역할 비중이 부족합니다.`;
  } else if (synergyPairs.length > 0) {
    summary = `확인된 모스트 픽 중 S/A 티어 영웅은 ${highTierCount}명이며, ${synergyPairs[0].first}–${synergyPairs[0].second} 조합의 역할 시너지가 있습니다. 상대 조합에 따라 카운터 픽을 유연하게 준비하세요.`;
  } else {
    summary = `현재 모스트 픽의 평균 메타 부합도는 ${metaFitScore}점입니다. 역할 구성은 1-2-2 기준으로 확인했으며, 구체적인 영웅 시너지는 분석 대상의 모스트 픽 조합에서 찾지 못했습니다.`;
  }

  const recommendations = picks.flatMap((pick) => {
    if (!pick.recommendation) return [];
    if (pick.hero && pick.recommendation.metaScore <= pick.hero.metaScore + 5) return [];
    return [`${pick.username}: ${pick.recommendation.name} (${pick.recommendation.tier}티어 · 메타 ${pick.recommendation.metaScore.toFixed(1)})를 대안 픽으로 검토하세요.`];
  }).slice(0, 3);

  if (missingRoles.length) recommendations.unshift(`팀 구성을 고려해 ${missingRoles.join("·")} 역할의 교체 가능 영웅을 준비하세요.`);
  if (synergyPairs.length) recommendations.push(`${synergyPairs[0].first}–${synergyPairs[0].second} 조합은 진입 콜과 쿨기 타이밍을 함께 맞춰 보세요.`);
  if (counterPairs.length) recommendations.push(`상대 영웅 확인 후 카운터 후보 ${counterPairs[0].counter}를 해당 역할의 대안으로 검토하세요.`);
  if (!recommendations.length) recommendations.push("모스트 픽 데이터를 바탕으로 현재 주력 영웅을 유지하고, 상대 조합에 맞는 교체 픽을 별도로 준비하세요.");

  return {
    metaFitScore,
    rosterCoverageScore,
    relationshipScore,
    picks,
    synergyPairs,
    counterPairs,
    summary,
    recommendations,
  };
}
