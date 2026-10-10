"use client";

import { useState } from "react";
import { ArrowLeftRight, BadgeCheck, Crosshair, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { HeroMetaAnalysis, SquadSynergyAnalysis } from "@/types/tier";

interface MetaSynergyCardProps {
  analysis: SquadSynergyAnalysis;
  onSelectSwap?: (playerId: string, heroKey: string) => void;
}

export function MetaSynergyCard({ analysis, onSelectSwap }: MetaSynergyCardProps) {
  const [selectedSwaps, setSelectedSwaps] = useState<Record<string, string>>({});
  const switchChoices = analysis.picks.filter((pick) => pick.recommendation);

  function chooseSwap(playerId: string, hero: HeroMetaAnalysis) {
    setSelectedSwaps((current) => ({ ...current, [playerId]: hero.key }));
    onSelectSwap?.(playerId, hero.key);
  }

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Squad Meta Sync</p>
        <h2 className="text-2xl font-bold text-white">메타 부합도 & 조합 진단</h2>
      </div>

      <Card className="overflow-hidden border-orange-500/20 bg-gradient-to-br from-slate-900 to-slate-950">
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-orange-300" />스쿼드 진단</CardTitle>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300">{analysis.summary}</p>
          </div>
          <div className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-4 py-3 text-right">
            <p className="text-[11px] uppercase tracking-wider text-orange-200/70">Meta Fit</p>
            <p className="text-3xl font-black text-orange-300">{analysis.metaFitScore}</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "메타 부합도", value: analysis.metaFitScore },
              { label: "역할 구성", value: analysis.rosterCoverageScore },
              { label: "조합 준비도", value: analysis.relationshipScore },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                <div className="flex justify-between text-xs text-slate-400"><span>{metric.label}</span><span>{metric.value}/100</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-300" style={{ width: `${metric.value}%` }} /></div>
              </div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {analysis.picks.map((pick) => (
              <div key={pick.playerId} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="truncate text-xs text-slate-400">{pick.username} · {pick.role === "tank" ? "탱커" : pick.role === "damage" ? "딜러" : "지원"}</p>
                <p className="mt-2 truncate font-semibold text-white">{pick.hero?.name ?? "모스트 데이터 없음"}</p>
                {pick.hero ? (
                  <p className="mt-1 text-xs text-slate-400">{pick.hero.tier} 티어 · 메타 {pick.hero.metaScore.toFixed(1)} · 개인 승률 {pick.personalWinrate?.toFixed(1) ?? "—"}%</p>
                ) : <p className="mt-1 text-xs text-slate-500">OverFast 프로필에서 영웅별 플레이 시간이 공개되지 않았습니다.</p>}
                {pick.recommendation ? (
                  <Button type="button" size="sm" variant="outline" className="mt-3 w-full justify-between" onClick={() => chooseSwap(pick.playerId, pick.recommendation!)}>
                    <span className="flex min-w-0 items-center gap-2 truncate"><ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />{selectedSwaps[pick.playerId] === pick.recommendation.key ? "추천 선택됨" : `${pick.recommendation.name} 검토`}</span>
                    <span className="text-orange-300">{pick.recommendation.tier}</span>
                  </Button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-800 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white"><BadgeCheck className="h-4 w-4 text-cyan-300" />조합 시너지</h3>
              {analysis.synergyPairs.length ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {analysis.synergyPairs.map((pair) => <li key={`${pair.first}-${pair.second}`} className="rounded-lg bg-slate-800/70 p-3"><span className="font-semibold text-cyan-200">{pair.first} + {pair.second}</span><p className="mt-1 text-xs leading-relaxed text-slate-400">{pair.reason}</p></li>)}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-400">확인된 모스트 픽 간 사전 정의 조합이 없습니다. 팀의 진입 속도와 사거리 밸런스를 리플레이에서 확인해 보세요.</p>}
            </div>
            <div className="rounded-xl border border-slate-800 p-4">
              <h3 className="flex items-center gap-2 font-semibold text-white"><Crosshair className="h-4 w-4 text-rose-300" />상대 픽 대응 후보</h3>
              {analysis.counterPairs.length ? (
                <ul className="mt-3 space-y-2 text-sm text-slate-300">
                  {analysis.counterPairs.slice(0, 4).map((pair) => <li key={`${pair.hero}-${pair.counter}`} className="rounded-lg bg-slate-800/70 p-3"><span className="font-semibold text-rose-200">{pair.hero} 대응: {pair.counter}</span><p className="mt-1 text-xs leading-relaxed text-slate-400">{pair.reason}</p></li>)}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-400">현재 모스트 픽에 대한 사전 정의 대응 후보가 없습니다.</p>}
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">대응 후보와 조합 설명은 픽 데이터만으로 산출한 휴리스틱 가이드입니다. 적 팀 픽·맵·패치 상황을 자동으로 알 수 없으므로 실제 카운터 확정 정보는 아닙니다.</p>
            </div>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
            <h3 className="font-semibold text-orange-200">코칭 액션</h3>
            <ul className="mt-2 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              {analysis.recommendations.map((recommendation) => <li key={recommendation} className="rounded-lg bg-slate-900/70 p-3">{recommendation}</li>)}
            </ul>
            {switchChoices.length === 0 ? <p className="mt-3 text-xs text-slate-500">스왑 추천은 공개된 플레이어 모스트 영웅과 역할 데이터가 있을 때 표시됩니다.</p> : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
