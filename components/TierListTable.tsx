"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HeroVoteModal } from "@/components/HeroVoteModal";
import type { LocalProfile } from "@/hooks/useLocalProfile";
import type { HeroMetaAnalysis, HeroTier } from "@/types/tier";
import type { RoleKey } from "@/lib/types";

const tierStyles: Record<HeroTier, string> = {
  S: "border-rose-400/40 bg-rose-500/10 text-rose-200",
  A: "border-orange-400/40 bg-orange-500/10 text-orange-200",
  B: "border-amber-300/40 bg-amber-400/10 text-amber-100",
  C: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  D: "border-slate-500/40 bg-slate-500/10 text-slate-300",
};

const roleLabels: Record<RoleKey, string> = { tank: "탱커", damage: "딜러", support: "힐러" };
const tierOrder: HeroTier[] = ["S", "A", "B", "C", "D"];
type SortField = "tier" | "metaScore" | "winrate" | "pickrate";

interface TierListTableProps {
  heroes: HeroMetaAnalysis[];
  roleFilter: RoleKey | "all";
  profile: LocalProfile | null;
  accessToken: string | null;
  onVoteSaved: () => void;
}

export function TierListTable({ heroes, roleFilter, profile, accessToken, onVoteSaved }: TierListTableProps) {
  const [selectedHero, setSelectedHero] = useState<HeroMetaAnalysis | null>(null);
  const [sortField, setSortField] = useState<SortField>("tier");
  const [descending, setDescending] = useState(true);
  const visibleHeroes = useMemo(() => {
    const filtered = heroes.filter((hero) => roleFilter === "all" || hero.role === roleFilter);
    const tierRank = (tier: HeroTier) => tierOrder.indexOf(tier);
    return [...filtered].sort((first, second) => {
      const firstValue = sortField === "tier" ? tierRank(first.tier) : first[sortField];
      const secondValue = sortField === "tier" ? tierRank(second.tier) : second[sortField];
      const comparison = typeof firstValue === "number" && typeof secondValue === "number"
        ? firstValue - secondValue
        : String(firstValue).localeCompare(String(secondValue));
      return (descending ? -1 : 1) * comparison || first.name.localeCompare(second.name);
    });
  }, [heroes, roleFilter, sortField, descending]);

  function chooseSort(field: SortField) {
    if (sortField === field) {
      setDescending((current) => !current);
      return;
    }
    setSortField(field);
    setDescending(true);
  }

  const sortLabels: Record<SortField, string> = {
    tier: "티어순",
    metaScore: "메타 점수순",
    winrate: "승률순",
    pickrate: "픽률순",
  };

  return (
    <section className="space-y-4">
      <Card className="min-w-0 overflow-hidden">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Meta Tier List</p>
              <CardTitle>영웅 메타 티어</CardTitle>
              <p className="mt-1 text-sm text-slate-400">표 헤더를 눌러 오름차순·내림차순을 전환하세요.</p>
            </div>
            <p className="text-sm text-slate-400">필터: {roleFilter === "all" ? "전체 영웅" : roleLabels[roleFilter]}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="tier-sort" className="text-xs font-medium text-slate-400">정렬 기준</label>
            <select
              id="tier-sort"
              value={sortField}
              onChange={(event) => { setSortField(event.target.value as SortField); setDescending(true); }}
              className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
            >
              {(Object.keys(sortLabels) as SortField[]).map((field) => <option key={field} value={field}>{sortLabels[field]}</option>)}
            </select>
            <button
              type="button"
              onClick={() => setDescending((current) => !current)}
              aria-label={descending ? "내림차순 정렬 중, 오름차순으로 전환" : "오름차순 정렬 중, 내림차순으로 전환"}
              title={descending ? "내림차순" : "오름차순"}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 text-slate-200 transition hover:bg-slate-800"
            >
              {descending ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
            </button>
            <span className="text-xs text-slate-500">{descending ? "내림차순" : "오름차순"}</span>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto pb-5">
          <table className="w-full min-w-[840px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-xs text-slate-400">
                <th className="px-3 py-2 font-medium">영웅</th>
                <th className="px-3 py-2 font-medium">역할</th>
                {(["tier", "metaScore", "winrate", "pickrate"] as SortField[]).map((field) => (
                  <th key={field} className="px-3 py-2 text-right font-medium">
                    <button
                      type="button"
                      onClick={() => chooseSort(field)}
                      aria-label={`${sortLabels[field]}${sortField === field ? descending ? " 내림차순 정렬 중" : " 오름차순 정렬 중" : "로 정렬"}`}
                      className="inline-flex items-center gap-1 rounded px-1 py-1 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    >
                      {sortLabels[field]}
                      {sortField === field ? descending ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-medium">유저 평균 체감 티어</th>
                <th className="px-3 py-2 text-right font-medium">밴률</th>
              </tr>
            </thead>
            <tbody>
              {visibleHeroes.map((hero) => (
                <tr key={hero.key} className="border-b border-slate-800/80 last:border-0 hover:bg-slate-800/50">
                  <td className="px-3 py-2">
                    <button type="button" className="flex items-center gap-3 text-left" onClick={() => setSelectedHero(hero)}>
                      <span className="w-8 text-xs text-slate-500">#{hero.rank}</span>
                      <Image src={hero.portrait} alt="" width={36} height={36} className="h-9 w-9 rounded-md object-cover" unoptimized />
                      <span className="font-semibold text-slate-100">{hero.name}</span>
                    </button>
                  </td>
                  <td className="px-3 py-2 text-slate-300">{roleLabels[hero.role]}</td>
                  <td className="px-3 py-2 text-right"><span className={`inline-flex min-w-8 justify-center rounded border px-2 py-1 font-bold ${tierStyles[hero.tier]}`}>{hero.tier}</span></td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums text-orange-300">{hero.metaScore.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-200">{hero.winrate.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-200">{hero.pickrate.toFixed(2)}%</td>
                  <td className="px-3 py-2 text-right tabular-nums text-cyan-200">{hero.communityTier ? `${hero.communityTier} · ${hero.communityVoteCount ?? 0}표` : "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-200">{hero.banrate === null ? "—" : `${hero.banrate.toFixed(2)}%`}</td>
                </tr>
              ))}
              {visibleHeroes.length === 0 ? <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-400">조건에 맞는 영웅이 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </CardContent>
      </Card>

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
              <div className="rounded-lg bg-slate-800 p-3"><dt className="text-slate-400">커뮤니티 평균</dt><dd className="mt-1 font-bold">{selectedHero.communityTier ?? "투표 없음"} {selectedHero.communityVoteCount ? `· ${selectedHero.communityVoteCount}표` : ""}</dd></div>
            </dl>
            <HeroVoteModal hero={selectedHero} profile={profile} accessToken={accessToken} onVoteSaved={onVoteSaved} />
            <p className="text-xs leading-relaxed text-slate-400">픽률·승률·밴률의 전체 영웅 집단 대비 정규화 점수와 픽률 신뢰도 보정으로 산출한 내부 지표이며, 공식 게임 등급은 아닙니다.</p>
          </DialogContent>
        ) : null}
      </Dialog>
    </section>
  );
}
