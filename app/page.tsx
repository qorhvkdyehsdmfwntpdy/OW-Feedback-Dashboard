"use client";

import { Crosshair } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BattleTagForm } from "@/components/BattleTagForm";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ExportButton } from "@/components/ExportButton";
import { FeedbackCards } from "@/components/FeedbackCards";
import { MetaSynergyCard } from "@/components/MetaSynergyCard";
import { MetricsRadarChart } from "@/components/MetricsRadarChart";
import { RoleFilterTabs } from "@/components/RoleFilterTabs";
import { ScoreCards } from "@/components/ScoreCards";
import { TierGraph } from "@/components/TierGraph";
import { TierListTable } from "@/components/TierListTable";
import { useTeamStorage } from "@/hooks/useTeamStorage";
import { analyzeSquadSynergy } from "@/lib/synergyAnalyzer";
import type { GameMode, PlayerAnalysis, SquadPlayerError } from "@/lib/types";
import type { HeroMetaDataset, MetaPlatform, MetaRegion } from "@/types/tier";

export default function HomePage() {
  const [tags, setTags] = useState<string[]>(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [analyses, setAnalyses] = useState<PlayerAnalysis[]>([]);
  const [errors, setErrors] = useState<SquadPlayerError[]>([]);
  const [gamemode, setGamemode] = useState<GameMode>("competitive");
  const [platform, setPlatform] = useState<MetaPlatform>("pc");
  const [region, setRegion] = useState<MetaRegion>("americas");
  const [roleFilter, setRoleFilter] = useState<"all" | "tank" | "damage" | "support">("all");
  const [metaDataset, setMetaDataset] = useState<HeroMetaDataset | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [selectedSwaps, setSelectedSwaps] = useState<Record<string, string>>({});
  const reportRef = useRef<HTMLDivElement>(null);
  const { teams, saveTeam, deleteTeam } = useTeamStorage();
  const synergy = useMemo(
    () => analyzeSquadSynergy(analyses, metaDataset?.heroes ?? []),
    [analyses, metaDataset],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function loadMeta() {
      setMetaLoading(true);
      setMetaError("");
      try {
        const params = new URLSearchParams({ gamemode, platform, region });
        const response = await fetch(`/api/meta?${params.toString()}`, { signal: controller.signal });
        const payload = (await response.json()) as HeroMetaDataset | { message?: string };
        if (!response.ok) throw new Error("message" in payload ? payload.message : "영웅 메타 조회 실패");
        setMetaDataset(payload as HeroMetaDataset);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "영웅 메타 데이터를 불러오지 못했습니다.";
        setMetaError(message);
        setMetaDataset(null);
      } finally {
        if (!controller.signal.aborted) setMetaLoading(false);
      }
    }
    void loadMeta();
    return () => controller.abort();
  }, [gamemode, platform, region]);

  function changeGamemode(nextGamemode: GameMode) {
    if (nextGamemode === gamemode) return;
    setGamemode(nextGamemode);
    setAnalyses([]);
    setErrors([]);
    setSelectedSwaps({});
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
      setSelectedSwaps({});

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

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
              {gamemode === "competitive" ? "Competitive Report" : "Quick Play Report"}
            </p>
            <h2 className="text-2xl font-bold text-white">
              {gamemode === "competitive" ? "경쟁전" : "빠른 대전"} 스쿼드 분석 결과
            </h2>
          </div>
          {analyses.length > 0 ? <ExportButton targetRef={reportRef} /> : null}
        </div>

        <div ref={reportRef} className="space-y-10 rounded-2xl bg-[#0f172a] p-2 text-slate-100">
          {analyses.length > 0 ? (
            <section className="space-y-5">
              <ScoreCards analyses={analyses} />
              <div className="grid gap-4 xl:grid-cols-5">
                <div className="min-w-0 xl:col-span-2"><MetricsRadarChart analyses={analyses} /></div>
                <div className="min-w-0 xl:col-span-3"><ComparisonTable analyses={analyses} /></div>
              </div>
              <FeedbackCards analyses={analyses} />
            </section>
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-10 text-center">
              <p className="text-lg font-semibold text-white">플레이어 분석은 아직 없습니다</p>
              <p className="mt-2 text-sm text-slate-400">배틀태그를 입력하고 분석하면 OW-Score와 실제 모스트 영웅 기반 진단을 확인할 수 있습니다.</p>
            </section>
          )}

          <section className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">Live Hero Meta</p>
                <h2 className="text-2xl font-bold text-white">영웅 메타 티어리스트</h2>
                <p className="mt-1 text-sm text-slate-400">OverFast 전체 영웅 픽·승·밴률 기반 중립적 상대 평가</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <label className="text-xs text-slate-400">플랫폼
                  <select value={platform} onChange={(event) => setPlatform(event.target.value as MetaPlatform)} className="mt-1 block h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 sm:w-32">
                    <option value="pc">PC</option><option value="console">콘솔</option>
                  </select>
                </label>
                <label className="text-xs text-slate-400">지역
                  <select value={region} onChange={(event) => setRegion(event.target.value as MetaRegion)} className="mt-1 block h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 sm:w-36">
                    <option value="americas">아메리카</option><option value="europe">유럽</option><option value="asia">아시아</option>
                  </select>
                </label>
              </div>
            </div>
            {metaError ? <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{metaError}</p> : null}
            {metaDataset ? <p className="text-xs text-slate-500">데이터: OverFast · {metaDataset.platform.toUpperCase()} · {metaDataset.region} · {new Date(metaDataset.fetchedAt).toLocaleString("ko-KR")}{metaDataset.heroes.some((hero) => hero.banrate === null) ? " · 밴률은 경쟁전 데이터에서만 제공됩니다." : ""}</p> : null}
            <RoleFilterTabs value={roleFilter} onChange={setRoleFilter} />
            <TierGraph
              heroes={(metaDataset?.heroes ?? []).filter((hero) => roleFilter === "all" || hero.role === roleFilter)}
              loading={metaLoading}
            />
            {metaDataset ? (
              <TierListTable heroes={metaDataset.heroes} roleFilter={roleFilter} />
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-sm text-slate-400">
                티어표는 OverFast의 실시간 통계 응답이 준비되면 표시됩니다.
              </div>
            )}
          </section>

          {analyses.length > 0 ? (
            <MetaSynergyCard
              analysis={synergy}
              onSelectSwap={(playerId, heroKey) => setSelectedSwaps((current) => ({ ...current, [playerId]: heroKey }))}
            />
          ) : (
            <section className="rounded-2xl border border-dashed border-slate-700 p-6 text-sm text-slate-400">
              스쿼드 메타 시너지와 역할 구성 진단은 플레이어 분석 후 표시됩니다.
            </section>
          )}
          {Object.keys(selectedSwaps).length > 0 ? <p className="text-xs text-slate-500">선택한 교체 후보는 참고용이며 실제 팀 픽은 변경하지 않습니다.</p> : null}
        </div>
      </div>
    </main>
  );
}
