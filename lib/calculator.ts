import type {
  CoachingReport,
  NormalizedPlayerStats,
  PlayerAnalysis,
  RoleKey,
  StyleTag,
} from "./types";

function clamp(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calcSurvivalScore(deathsPer10min: number): number {
  if (!Number.isFinite(deathsPer10min) || deathsPer10min < 0) return 0;
  if (deathsPer10min <= 4.5) {
    return 100;
  }

  if (deathsPer10min <= 8) {
    const t = (deathsPer10min - 4.5) / 3.5;
    const smooth = t * t * (3 - 2 * t);
    return round1(100 - 58 * smooth);
  }

  const over = deathsPer10min - 8;
  const steep = 42 * Math.exp(-0.72 * ((over * over) / 4));
  return round1(clamp(steep));
}

function scoreAgainstBench(value: number, good: number, excellent: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (value >= excellent) return 100;
  if (value >= good) {
    return 70 + ((value - good) / (excellent - good)) * 30;
  }
  return (value / good) * 70;
}

function kdaScore(kda: number): number {
  return scoreAgainstBench(kda, 2.4, 4.2);
}

function winrateScore(winrate: number): number {
  return clamp((winrate - 40) * 5);
}

const ROLE_BENCHMARKS: Record<
  RoleKey,
  { damageGood: number; damageExcellent: number; healGood: number; healExcellent: number }
> = {
  tank: {
    damageGood: 7800,
    damageExcellent: 11000,
    healGood: 400,
    healExcellent: 1800,
  },
  damage: {
    damageGood: 9000,
    damageExcellent: 13000,
    healGood: 200,
    healExcellent: 1200,
  },
  support: {
    damageGood: 4200,
    damageExcellent: 7200,
    healGood: 6200,
    healExcellent: 9200,
  },
};

const ROLE_WEIGHTS: Record<
  RoleKey,
  { survival: number; damage: number; healing: number; kda: number; winrate: number }
> = {
  tank: { survival: 0.32, damage: 0.28, healing: 0.05, kda: 0.2, winrate: 0.15 },
  damage: { survival: 0.18, damage: 0.38, healing: 0.02, kda: 0.22, winrate: 0.2 },
  support: { survival: 0.25, damage: 0.1, healing: 0.35, kda: 0.15, winrate: 0.15 },
};

export function calcOwScore(player: NormalizedPlayerStats, survival: number): number {
  const bench = ROLE_BENCHMARKS[player.mainRole];
  const weights = ROLE_WEIGHTS[player.mainRole];
  const damage = scoreAgainstBench(
    player.damagePer10min,
    bench.damageGood,
    bench.damageExcellent,
  );
  const healing = scoreAgainstBench(
    player.healingPer10min,
    bench.healGood,
    bench.healExcellent,
  );
  const kda = kdaScore(player.kda);
  const winrate = winrateScore(player.winrate);

  const total =
    survival * weights.survival +
    damage * weights.damage +
    healing * weights.healing +
    kda * weights.kda +
    winrate * weights.winrate;

  return round1(clamp(total));
}

export function getStyleTag(player: NormalizedPlayerStats): StyleTag {
  const deaths = player.deathsPer10min;
  const highDamage =
    player.mainRole === "support"
      ? player.damagePer10min >= 5200
      : player.damagePer10min >= 9500;

  if (deaths >= 7 && highDamage) {
    return {
      key: "high-risk",
      label: "🔥 하이리스크 하이리턴 (돌격형)",
    };
  }

  if (deaths <= 4.5 && player.winrate >= 53) {
    return {
      key: "survival",
      label: "🛡️ 단단한 생존형 (국밥형)",
    };
  }

  if (player.kda < 2 && deaths > 6.5) {
    return {
      key: "positioning",
      label: "⚠️ 포지셔닝 불안형",
    };
  }

  return {
    key: "balanced",
    label: "⚖️ 밸런스형",
  };
}

function roleKo(role: RoleKey): string {
  if (role === "tank") return "탱커";
  if (role === "support") return "지원가";
  return "딜러";
}

export function buildCoachingReport(
  player: NormalizedPlayerStats,
  survivalScore: number,
  owScore: number,
  style: StyleTag,
): CoachingReport {
  const role = roleKo(player.mainRole);
  const deaths = player.deathsPer10min.toFixed(1);
  const kda = player.kda.toFixed(2);
  const wr = player.winrate.toFixed(1);

  if (style.key === "high-risk") {
    return {
      tone: "warning",
      headline: `${player.username} · 진입 타이밍을 한 템포 늦추세요`,
      summary: `${role} 기준 10분당 데스 ${deaths}회, KDA ${kda}로 화력은 나오지만 리스크가 큽니다. 리플레이에서 첫 데스가 팀 콜 붕괴로 이어진 교전을 표시하고, 오프앵글 진입 전 쿨기·지원 시야를 확인하세요.`,
      focus: [
        "첫 데스 발생 시점의 위치와 쿨기 상태를 복기",
        "하이그라운드/커버에서 딜 각을 만든 뒤 진입",
        "킬 확정 이후 리셋 타이밍을 팀 합과 맞추기",
      ],
    };
  }

  if (style.key === "survival") {
    return {
      tone: "excellent",
      headline: `${player.username} · 생존 템포가 스쿼드의 기준점입니다`,
      summary: `데스 ${deaths}/10분, 승률 ${wr}%로 안정적인 국밥형 플레이입니다. OW-Score ${owScore}점은 포지션 유지가 승리에 기여하고 있다는 신호입니다. 리플레이에서는 살아남은 교전에서 공간 장악이 팀 딜/힐 효율로 어떻게 이어졌는지 체크하세요.`,
      focus: [
        "생존한 교전의 공간 장악 동선을 팀 공용 루트로 공유",
        "승률을 유지하는 선에서 적극적인 쿨기 사용 타이밍 확장",
        "스쿼드 콜에서 리셋/홀드 기준을 이 플레이어에 맞추기",
      ],
    };
  }

  if (style.key === "positioning") {
    return {
      tone: "warning",
      headline: `${player.username} · 포지셔닝 리셋이 최우선입니다`,
      summary: `KDA ${kda}, 10분당 데스 ${deaths}회로 생존 점수 ${survivalScore}점이 급감합니다. 리플레이 필터를 본인 데스 클립만 모아 고립, 과한 각, 지원 라인 단절 여부를 확인하세요. ${role}로서 딜량보다 죽는 위치가 스쿼드 패배로 직결되고 있습니다.`,
      focus: [
        "데스 로그를 맵 구역별로 분류해 반복 실수 위치 찾기",
        "메인 교전선 뒤에서 각을 만드는 연습",
        "지원/탱 쿨기와 동시에만 공세에 가담하기",
      ],
    };
  }

  const tone: CoachingReport["tone"] =
    owScore >= 72 ? "excellent" : owScore <= 55 ? "warning" : "neutral";

  return {
    tone,
    headline: `${player.username} · 밸런스를 유지하며 한 지표만 끌어올리세요`,
    summary: `${role} 밸런스형입니다. 승률 ${wr}%, KDA ${kda}, 생존 점수 ${survivalScore}점입니다. 리플레이에서는 평균 교전 대비 유독 수치가 꺾인 한 맵(데스 급증 또는 딜/힐 공백)을 골라 그 한 장면만 반복 복기하세요.`,
    focus: [
      "가장 낮은 레이더 축(생존/딜/힐/KDA/승률)을 이번 주 개선 목표로 지정",
      "히어로 2픽의 교전 기여를 메인 픽과 비교",
      "스쿼드 분석 후 역할 콜이 겹치는 구간을 줄이기",
    ],
  };
}

export function analyzePlayer(player: NormalizedPlayerStats): PlayerAnalysis {
  const survivalScore = calcSurvivalScore(player.deathsPer10min);
  const owScore = calcOwScore(player, survivalScore);
  const styleTag = getStyleTag(player);
  const bench = ROLE_BENCHMARKS[player.mainRole];

  return {
    player,
    survivalScore,
    owScore,
    styleTag,
    radar: {
      survival: survivalScore,
      damage: round1(
        clamp(
          scoreAgainstBench(
            player.damagePer10min,
            bench.damageGood,
            bench.damageExcellent,
          ),
        ),
      ),
      healing: round1(
        clamp(
          scoreAgainstBench(
            player.healingPer10min,
            bench.healGood,
            bench.healExcellent,
          ),
        ),
      ),
      kda: round1(clamp(kdaScore(player.kda))),
      winrate: round1(clamp(winrateScore(player.winrate))),
    },
    coaching: buildCoachingReport(player, survivalScore, owScore, styleTag),
  };
}

export function analyzeSquad(players: NormalizedPlayerStats[]): PlayerAnalysis[] {
  return players.map(analyzePlayer);
}
