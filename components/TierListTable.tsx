"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { HeroMetaAnalysis, HeroTier } from "@/types/tier";
import type { RoleKey } from "@/lib/types";

const tierStyles: Record<HeroTier, string> = {
  S: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  A: "border-orange-400/40 bg-orange-500/10 text-orange-200",
  B: "border-amber-300/40 bg-amber-400/10 text-amber-100",
  C: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  D: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

const roleLabels: Record<RoleKey, string> = { tank: "탱커", damage: "딜러", support: "지원가" };
const tierOrder: HeroTier[] = ["S", "A", "B", "C", "D"];

interface TierListTableProps {
  heroes: HeroMetaAnalysis[];
  roleFilter: RoleKey | "all";
}

export function TierListTable({ heroes, roleFilter }: TierListTableProps) {
  const [selectedHero, setSelectedHero] = useState<HeroMetaAnalysis | null>(null);
  const visibleHeroes = heroes.filter((hero) => roleFilter === "all" || hero.role === roleFilter);
  return (
    <section className="space-y-4">
      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Meta Tier List</p>
            <CardTitle>영웅 메타 티어</CardTitle>
            <p className="mt-1 text-sm text-slate-400">티어는 현재 조회한 영웅 집단의 상대 점수 분포로 구분됩니다.</p>
          </div>
          <p className="text-sm text-slate-400">필터: {roleFilter === "all" ? "전체 영웅" : roleLabels[roleFilter]}</p>
        </CardHeader>
      </Card>

      {tierOrder.map((tier) => {
        const group = visibleHeroes.filter((hero) => hero.tier === tier);
        if (group.length === 0) return null;
        return (
          <Card key={tier} className="min-w-0 overflow-hidden">
            <CardHeader className="flex-row items-center justify-between py-4">
              <CardTitle className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border text-xl font-black ${tierStyles[tier]}`}>{tier}</CardTitle>
              <p className="text-sm text-slate-400">{group.length}명 · 높은 메타 점수 순</p>
            </CardHeader>
            <CardContent className="overflow-x-auto pb-5">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs text-slate-400">
                    <th className="px-3 py-2 font-medium">순위 / 영웅</th>
                    <th className="px-3 py-2 font-medium">역할</th>
                    <th className="px-3 py-2 text-right font-medium">픽률</th>
                    <th className="px-3 py-2 text-right font-medium">승률</th>
                    <th className="px-3 py-2 text-right font-medium">밴률</th>
                    <th className="px-3 py-2 text-right font-medium">OW 메타 점수</th>
                  </tr>
                </thead>
                <tbody>
                  {group.map((hero) => (
                    <tr key={hero.key} className="border-b border-slate-800/80 last:border-0 hover:bg-slate-800/50">
                      <td className="px-3 py-2">
                        <button type="button" className="flex items-center gap-3 text-left" onClick={() => setSelectedHero(hero)}>
                          <span className="w-8 text-xs text-slate-500">#{hero.rank}</span>
                          <Image src={hero.portrait} alt="" width={36} height={36} className="h-9 w-9 rounded-md object-cover" unoptimized />
                          <span className="font-semibold text-slate-100">{hero.name}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{roleLabels[hero.role]}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-200">{hero.pickrate.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-200">{hero.winrate.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-200">{hero.banrate === null ? "—" : `${hero.banrate.toFixed(2)}%`}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-orange-300">{hero.metaScore.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={Boolean(selectedHero)} onOpenChange={(open) => { if (!open) setSelectedHero(null); }}>
        {selectedHero ? (
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <Image src={selectedHero.portrait} alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover" unoptimized />
                {selectedHero.name} · {selectedHero.tier} 티어
              </DialogTitle>
              <DialogDescription>{roleLabels[selectedHero.role]} · {selectedHero.subrole} · 상대 순위 #{selectedHero.rank}</DialogDescription>
            </DialogHeader>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-800 p-3"><dt className="text-slate-400">픽률</dt><dd className="mt-1 font-bold">{selectedHero.pickrate.toFixed(2)}%</dd></div>
              <div className="rounded-lg bg-slate-800 p-3"><dt className="text-slate-400">승률</dt><dd className="mt-1 font-bold">{selectedHero.winrate.toFixed(2)}%</dd></div>
              <div className="rounded-lg bg-slate-800 p-3"><dt className="text-slate-400">밴률</dt><dd className="mt-1 font-bold">{selectedHero.banrate === null ? "현재 모드에서 미제공" : `${selectedHero.banrate.toFixed(2)}%`}</dd></div>
              <div className="rounded-lg bg-slate-800 p-3"><dt className="text-slate-400">복합 메타 점수</dt><dd className="mt-1 font-bold text-orange-300">{selectedHero.metaScore.toFixed(1)} / 100</dd></div>
            </dl>
            <p className="text-xs leading-relaxed text-slate-400">픽률·승률·밴률의 전체 영웅 집단 대비 정규화 점수와 픽률 신뢰도 보정으로 산출한 내부 지표이며, 공식 게임 등급은 아닙니다.</p>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
