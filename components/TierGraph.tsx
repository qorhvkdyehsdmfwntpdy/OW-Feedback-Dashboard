"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeroMetaAnalysis, HeroTier } from "@/types/tier";

const tierColors: Record<HeroTier, string> = {
  S: "#fb7185",
  A: "#f97316",
  B: "#facc15",
  C: "#38bdf8",
  D: "#94a3b8",
};

interface TierGraphProps {
  heroes: HeroMetaAnalysis[];
  loading?: boolean;
}

export function TierGraph({ heroes, loading = false }: TierGraphProps) {
  const averagePickZ = heroes.length ? heroes.reduce((sum, hero) => sum + hero.zPick, 0) / heroes.length : 0;
  const averageWinZ = heroes.length ? heroes.reduce((sum, hero) => sum + hero.zWin, 0) / heroes.length : 0;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Hero Meta Map</p>
        <CardTitle>상대 픽률 × 승률 분포</CardTitle>
        <p className="text-sm text-slate-400">축은 전체 영웅 대비 Z-Score입니다. 점 크기는 픽률, 색상은 산출 티어를 뜻합니다.</p>
        <p className="text-xs leading-relaxed text-slate-500">M = sigmoid(Z승률) × ln(1 + 보정 픽률) − 0.15 × Z밴률 · 티어 구간은 점수 분위수(S 상위 10%, A 20%, B 30%, C 25%, D 하위 15%) 기반</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[360px] animate-pulse rounded-lg bg-slate-800/60" aria-label="메타 그래프 불러오는 중" />
        ) : heroes.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-center text-sm text-slate-400">
            표시할 영웅 통계가 없습니다. 플랫폼, 지역 또는 게임 모드를 바꿔 다시 시도해 주세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="h-[360px] min-w-[520px] sm:h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 18, right: 24, bottom: 30, left: 8 }}>
                  <CartesianGrid stroke="#334155" strokeDasharray="4 4" />
                  <XAxis
                    type="number"
                    dataKey="zPick"
                    name="픽률 Z"
                    domain={([minimum, maximum]: [number, number]) => [Math.min(minimum, -2), Math.max(maximum, 2)]}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={{ stroke: "#475569" }}
                    label={{ value: "상대 픽률 Z-Score", position: "insideBottom", offset: -18, fill: "#cbd5e1", fontSize: 12 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="zWin"
                    name="승률 Z"
                    domain={([minimum, maximum]: [number, number]) => [Math.min(minimum, -2), Math.max(maximum, 2)]}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={{ stroke: "#475569" }}
                    label={{ value: "상대 승률 Z-Score", angle: -90, position: "insideLeft", fill: "#cbd5e1", fontSize: 12 }}
                  />
                  <ZAxis type="number" dataKey="pickrate" range={[70, 280]} name="픽률" unit="%" />
                  <ReferenceLine x={averagePickZ} stroke="#64748b" strokeDasharray="4 4" />
                  <ReferenceLine y={averageWinZ} stroke="#64748b" strokeDasharray="4 4" />
                  <Tooltip
                    cursor={{ strokeDasharray: "4 4" }}
                    contentStyle={{ background: "#0f172a", border: "1px solid #475569", borderRadius: 10, color: "#f1f5f9" }}
                    formatter={(value, name, item) => {
                      const hero = item.payload as HeroMetaAnalysis;
                      if (name === "픽률") return [`${hero.pickrate.toFixed(2)}%`, "픽률"];
                      return [typeof value === "number" ? value.toFixed(2) : value, name];
                    }}
                    labelFormatter={(_, payload) => {
                      const hero = payload[0]?.payload as HeroMetaAnalysis | undefined;
                      return hero ? `${hero.name} · ${hero.tier} 티어 · #${hero.rank}` : "영웅 메타";
                    }}
                  />
                  {(["S", "A", "B", "C", "D"] as HeroTier[]).map((tier) => (
                    <Scatter
                      key={tier}
                      name={`${tier} 티어`}
                      data={heroes.filter((hero) => hero.tier === tier)}
                      fill={tierColors[tier]}
                      fillOpacity={0.82}
                      stroke="#0f172a"
                      strokeWidth={1}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-300">
          {Object.entries(tierColors).map(([tier, color]) => (
            <span key={tier} className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />{tier} 티어
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
