import { HeartPulse, Shield, Swords } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayerAnalysis, RoleKey } from "@/lib/types";
import { PLAYER_COLORS } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_META: Record<RoleKey, { label: string; icon: typeof Shield }> = {
  tank: { label: "탱커", icon: Shield },
  damage: { label: "딜러", icon: Swords },
  support: { label: "지원", icon: HeartPulse },
};

interface ScoreCardsProps {
  analyses: PlayerAnalysis[];
}

export function ScoreCards({ analyses }: ScoreCardsProps) {
  if (analyses.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          Score Overview
        </p>
        <h2 className="text-2xl font-bold text-white">OW-Score & 성향</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {analyses.map((analysis, index) => {
          const RoleIcon = ROLE_META[analysis.player.mainRole].icon;
          const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
          return (
            <Card
              key={analysis.player.playerId}
              className="overflow-hidden border-t-4"
              style={{ borderTopColor: color }}
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  {analysis.player.avatar ? (
                    <Image
                      src={analysis.player.avatar}
                      alt={analysis.player.username}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-lg border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 text-lg font-bold">
                      {analysis.player.username.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{analysis.player.username}</p>
                    <p className="truncate text-xs text-slate-400">{analysis.player.battleTag}</p>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">OW-Score</p>
                    <p className="text-4xl font-black leading-none" style={{ color }}>
                      {analysis.owScore.toFixed(0)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <p>생존 {analysis.survivalScore.toFixed(0)}</p>
                    <p>
                      {analysis.player.gamesPlayed}판 · {analysis.player.gamemode === "competitive"
                        ? "경쟁전"
                        : "전체"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-200">
                  <RoleIcon className="h-4 w-4 text-orange-400" />
                  {ROLE_META[analysis.player.mainRole].label} · {analysis.player.competitiveLabel}
                </div>

                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-center text-xs font-semibold",
                    analysis.styleTag.key === "positioning" || analysis.styleTag.key === "high-risk"
                      ? "bg-orange-500/15 text-orange-200"
                      : "bg-cyan-400/10 text-cyan-100",
                  )}
                >
                  {analysis.styleTag.label}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
