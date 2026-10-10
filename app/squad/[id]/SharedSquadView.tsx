"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ScoreCards } from "@/components/ScoreCards";
import { FeedbackCards } from "@/components/FeedbackCards";
import { MetricsRadarChart } from "@/components/MetricsRadarChart";
import { ComparisonTable } from "@/components/ComparisonTable";
import { MetaSynergyCard } from "@/components/MetaSynergyCard";
import type { GameMode, PlayerAnalysis, SquadPlayerError } from "@/lib/types";
import type { SquadSynergyAnalysis } from "@/types/tier";

interface SharedTeam {
  id: string;
  name: string;
  battle_tags: string[];
  gamemode: GameMode;
}

interface SharedSquadViewProps {
  id: string;
}

export function SharedSquadView({ id }: SharedSquadViewProps) {
  const [team, setTeam] = useState<SharedTeam | null>(null);
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [errors, setErrors] = useState<SquadPlayerError[]>([]);
  const [synergy, setSynergy] = useState<SquadSynergyAnalysis | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const sharedResponse = await fetch(`/api/squads/${id}`, { signal: controller.signal });
        const sharedPayload = await sharedResponse.json() as { team?: SharedTeam; message?: string };
        if (!sharedResponse.ok || !sharedPayload.team) throw new Error(sharedPayload.message ?? "공유 스쿼드를 불러오지 못했습니다.");
        setTeam(sharedPayload.team);
        const analysisResponse = await fetch("/api/squad", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ battleTags: sharedPayload.team.battle_tags, gamemode: sharedPayload.team.gamemode }),
          signal: controller.signal,
        });
        const analysisPayload = await analysisResponse.json() as { analyses?: PlayerAnalysis[]; errors?: SquadPlayerError[]; message?: string };
        if (!analysisResponse.ok) throw new Error(analysisPayload.message ?? "전적 분석을 불러오지 못했습니다.");
        setAnalyses(analysisPayload.analyses ?? []);
        setErrors(analysisPayload.errors ?? []);
        const metaResponse = await fetch("/api/meta?gamemode=competitive&platform=pc&region=americas", { signal: controller.signal });
        if (metaResponse.ok) {
          const meta = await metaResponse.json() as { heroes?: import("@/types/tier").HeroMetaAnalysis[] };
          if (meta.heroes) {
            const { analyzeSquadSynergy } = await import("@/lib/synergyAnalyzer");
            setSynergy(analyzeSquadSynergy(analysisPayload.analyses ?? [], meta.heroes));
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : "공유 분석을 불러오지 못했습니다.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> 대시보드</Link>
        {loading ? <div className="flex min-h-72 items-center justify-center gap-3 text-slate-300"><Loader2 className="h-5 w-5 animate-spin" />공유된 스쿼드 분석 중</div> : null}
        {message ? <section className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">{message}</section> : null}
        {!loading && team ? (
          <>
            <header className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Shared Squad · {team.gamemode === "competitive" ? "경쟁전" : "빠른 대전"}</p><h1 className="text-3xl font-bold text-white">{team.name}</h1><p className="text-sm text-slate-400">이 링크는 로그인 없이 열람 가능하며 최신 공개 전적을 다시 조회해 분석합니다.</p></header>
            {errors.length ? <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">일부 플레이어의 프로필 또는 모드 전적을 조회하지 못했습니다: {errors.map((error) => error.battleTag).join(", ")}</section> : null}
            <ScoreCards analyses={analyses} />
            {analyses.length ? <><div className="grid gap-4 xl:grid-cols-5"><div className="min-w-0 xl:col-span-2"><MetricsRadarChart analyses={analyses} /></div><div className="min-w-0 xl:col-span-3"><ComparisonTable analyses={analyses} /></div></div><FeedbackCards analyses={analyses} />{synergy ? <MetaSynergyCard analysis={synergy} /> : null}</> : <p className="rounded-xl border border-slate-800 p-6 text-slate-300">분석 가능한 플레이어 통계가 없습니다.</p>}
          </>
        ) : null}
      </div>
    </main>
  );
}
