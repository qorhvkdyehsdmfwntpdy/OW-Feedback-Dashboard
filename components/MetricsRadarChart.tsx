"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerAnalysis } from "@/lib/types";
import { PLAYER_COLORS } from "@/lib/types";

interface MetricsRadarChartProps {
  analyses: PlayerAnalysis[];
}

export function MetricsRadarChart({ analyses }: MetricsRadarChartProps) {
  if (analyses.length === 0) return null;

  const data = [
    {
      metric: "생존",
      ...Object.fromEntries(analyses.map((item) => [item.player.username, item.radar.survival])),
    },
    {
      metric: "딜량",
      ...Object.fromEntries(analyses.map((item) => [item.player.username, item.radar.damage])),
    },
    {
      metric: "힐량",
      ...Object.fromEntries(analyses.map((item) => [item.player.username, item.radar.healing])),
    },
    {
      metric: "KDA",
      ...Object.fromEntries(analyses.map((item) => [item.player.username, item.radar.kda])),
    },
    {
      metric: "승률",
      ...Object.fromEntries(analyses.map((item) => [item.player.username, item.radar.winrate])),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          Visual Analytics
        </p>
        <CardTitle>5인 스탯 비교 레이더</CardTitle>
      </CardHeader>
      <CardContent className="h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: "#cbd5e1", fontSize: 12 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: "#64748b", fontSize: 10 }}
            />
            {analyses.map((item, index) => (
              <Radar
                key={item.player.playerId}
                name={item.player.username}
                dataKey={item.player.username}
                stroke={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                fill={PLAYER_COLORS[index % PLAYER_COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ color: "#e2e8f0" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
