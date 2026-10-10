"use client";

import { Crosshair } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { BattleTagForm } from "@/components/BattleTagForm";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ExportButton } from "@/components/ExportButton";
import { FeedbackCards } from "@/components/FeedbackCards";
import { MetricsRadarChart } from "@/components/MetricsRadarChart";
import { ScoreCards } from "@/components/ScoreCards";
import { useTeamStorage } from "@/hooks/useTeamStorage";
import type { GameMode, PlayerAnalysis, SquadPlayerError } from "@/lib/types";

export default function HomePage() {
  const [tags, setTags] = useState<string[]>(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [errors, setErrors] = useState<SquadPlayerError[]>([]);
  const [gamemode, setGamemode] = useState<GameMode>("competitive");
  const reportRef = useRef<HTMLDivElement>(null);
  const { teams, saveTeam, deleteTeam } = useTeamStorage();

  function changeGamemode(nextGamemode: GameMode) {
    if (nextGamemode === gamemode) return;
    setGamemode(nextGamemode);
    setAnalyses([]);
    setErrors([]);
  }

  function handleSaveTeam(name: string, battleTags: string[]) {
    const saved = saveTeam(name, battleTags);
    if (saved) toast.success(`팀 “${name.trim()}”을(를) 저장했습니다.`);
    return saved;
  }

  function handleDeleteTeam(teamId: string) {
    const deleted = deleteTeam(teamId);
    if (deleted) toast.success("저장된 팀을 삭제했습니다.");
    return deleted;
  }

  async function analyzeSquad() {
    setLoading(true);
    try {
      const response = await fetch("/api/squad", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          battleTags: tags.map((tag) => tag.trim()).filter(Boolean),
          gamemode,
        }),
      });

      const payload = (await response.json()) as {
        analyses?: PlayerAnalysis[];
        errors?: SquadPlayerError[];
        message?: string;
      };

      if (!response.ok) {
        toast.error(payload.message ?? "스쿼드 분석에 실패했습니다.");
        return;
      }

      setAnalyses(payload.analyses ?? []);
      setErrors(payload.errors ?? []);

      if ((payload.errors ?? []).length > 0) {
        toast.error("해당 유저는 비공개 프로필입니다");
      } else if ((payload.analyses ?? []).length > 0) {
        toast.success("스쿼드 분석을 완료했습니다.");
      }
    } catch {
      toast.error("전적 API에 연결하지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.18),_transparent_55%)]" />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">
            <Crosshair className="h-3.5 w-3.5" />
            Overwatch Squad Intel
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            OW-Feedback-Dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            5인 스쿼드 배틀태그를 입력하면 OverFast 전적을 불러와 자체 OW-Score, 성향 태그, 리플레이
            복기용 코칭 리포트를 한 화면에 시각화합니다.
          </p>
        </header>

        <BattleTagForm
          tags={tags}
          loading={loading}
          errors={errors}
          gamemode={gamemode}
          teams={teams}
          onGamemodeChange={changeGamemode}
          onTagsChange={setTags}
          onSaveTeam={handleSaveTeam}
          onDeleteTeam={handleDeleteTeam}
          onSubmit={analyzeSquad}
          onClearErrors={() => setErrors([])}
        />

        {analyses.length > 0 ? (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
                  {gamemode === "competitive" ? "Competitive Report" : "Quick Play Report"}
                </p>
                <h2 className="text-2xl font-bold text-white">
                  {gamemode === "competitive" ? "경쟁전" : "빠른 대전"} 스쿼드 분석 결과
                </h2>
              </div>
              <ExportButton targetRef={reportRef} />
            </div>
            <div
              ref={reportRef}
              className="space-y-6 rounded-2xl bg-[#0f172a] p-2 text-slate-100"
            >
              <ScoreCards analyses={analyses} />
              <div className="grid gap-4 xl:grid-cols-5">
                <div className="xl:col-span-2">
                  <MetricsRadarChart analyses={analyses} />
                </div>
                <div className="xl:col-span-3">
                  <ComparisonTable analyses={analyses} />
                </div>
              </div>
              <FeedbackCards analyses={analyses} />
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-16 text-center">
            <p className="text-lg font-semibold text-white">아직 분석된 스쿼드가 없습니다</p>
            <p className="mt-2 text-sm text-slate-400">
              배틀태그를 입력하고 스쿼드 분석을 실행하면 점수 카드, 레이더 차트, 코칭 리포트가
              표시됩니다.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
