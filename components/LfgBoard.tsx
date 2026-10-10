"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Users, UserPlus, XCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { LocalProfile } from "@/hooks/useLocalProfile";
import { getSupabaseClient } from "@/lib/supabase";
import type { LfgPosition, LfgPost, LfgPurpose, LfgRank } from "@/types/lfg";

interface LfgBoardProps {
  profile: LocalProfile | null;
  accessToken: string | null;
}

const positions: Record<LfgPosition, string> = { any: "전체 포지션", tank: "탱커", damage: "딜러", healer: "힐러", support: "서포트" };
const purposes: Record<LfgPurpose, string> = { scrim: "스크림", competitive: "경쟁전", quickplay: "빠른 대전" };
const ranks: Record<LfgRank, string> = { any: "전체 티어", bronze: "브론즈", silver: "실버", gold: "골드", platinum: "플래티넘", diamond: "다이아몬드", master: "마스터", grandmaster: "그랜드마스터", champion: "챔피언" };
const selectablePositions = Object.entries(positions).filter(([key]) => key !== "any") as Array<[Exclude<LfgPosition, "any">, string]>;

export function LfgBoard({ profile, accessToken }: LfgBoardProps) {
  const [posts, setPosts] = useState<LfgPost[]>([]);
  const [purposeFilter, setPurposeFilter] = useState<LfgPurpose | "all">("all");
  const [positionFilter, setPositionFilter] = useState<LfgPosition>("any");
  const [rankFilter, setRankFilter] = useState<LfgRank>("any");
  const [openFilter, setOpenFilter] = useState<"open" | "closed" | "all">("open");
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<LfgPurpose>("competitive");
  const [position, setPosition] = useState<Exclude<LfgPosition, "any">>("damage");
  const [targetTier, setTargetTier] = useState<LfgRank>("any");
  const [totalMembers, setTotalMembers] = useState(5);
  const [discordId, setDiscordId] = useState("");
  const [contactBattleTag, setContactBattleTag] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadPosts = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (purposeFilter !== "all") params.set("purpose", purposeFilter);
    if (positionFilter !== "any") params.set("position", positionFilter);
    if (rankFilter !== "any") params.set("targetTier", rankFilter);
    if (openFilter !== "all") params.set("isOpen", String(openFilter === "open"));
    const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
    const response = await fetch(`/api/lfg?${params.toString()}`, { cache: "no-store", headers, signal });
    const payload = await response.json() as { posts?: LfgPost[]; message?: string };
    if (!response.ok) throw new Error(payload.message ?? "LFG 목록 조회 실패");
    setPosts(payload.posts ?? []);
    setError("");
  }, [accessToken, openFilter, positionFilter, purposeFilter, rankFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      void loadPosts(controller.signal)
        .catch((loadError: unknown) => {
          if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "LFG 목록을 불러오지 못했습니다.");
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timeoutId); controller.abort(); };
  }, [loadPosts]);

  useEffect(() => {
    const intervalId = window.setInterval(() => { void loadPosts().catch(() => undefined); }, 20_000);
    return () => window.clearInterval(intervalId);
  }, [loadPosts]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase.channel("lfg-posts-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lfg_posts" }, () => { void loadPosts().catch(() => undefined); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadPosts]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || !accessToken) {
      toast.error("모집글 작성에는 로컬 프로필과 Supabase 익명 인증이 필요합니다.");
      return;
    }
    try {
      const response = await fetch("/api/lfg", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          authorNickname: profile.nickname,
          authorBattleTag: profile.battleTag,
          title,
          description,
          purpose,
          position,
          targetTier,
          totalMembers,
          discordId,
          contactBattleTag: contactBattleTag.trim() || profile.battleTag,
        }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "게시글 작성 실패");
      setTitle("");
      setDescription("");
      setDiscordId("");
      setContactBattleTag("");
      setCreateOpen(false);
      await loadPosts();
      toast.success("팀원 모집글을 등록했습니다.");
    } catch (postError) {
      toast.error(postError instanceof Error ? postError.message : "게시글 작성에 실패했습니다.");
    }
  }

  async function updatePost(post: LfgPost, action: "apply" | "close") {
    if (!profile || !accessToken) {
      toast.error("지원 또는 마감하려면 로컬 프로필과 Supabase 인증이 필요합니다.");
      return;
    }
    setBusyId(post.id);
    try {
      const response = await fetch(`/api/lfg/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "요청 실패");
      await loadPosts();
      toast.success(action === "apply" ? "모집글에 지원했습니다." : "모집글을 마감했습니다.");
    } catch (requestError) {
      toast.error(requestError instanceof Error ? requestError.message : "요청을 처리하지 못했습니다.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Looking For Group</p>
          <h2 className="mt-1 text-2xl font-bold text-white">그룹 찾기</h2>
          <p className="mt-1 text-xs text-slate-500">새 글과 지원 현황은 실시간 또는 20초 간격으로 갱신됩니다.</p>
        </div>
        <Button type="button" onClick={() => {
          if (!profile) toast.error("모집글 작성 전에 프로필을 등록해 주세요.");
          else setCreateOpen(true);
        }}>
          <Plus /> 팀원 모집하기
        </Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>팀원 모집하기</DialogTitle>
              <DialogDescription>모집 조건과 연락 수단을 등록합니다. 배틀태그와 Discord ID는 게시판에 공개됩니다.</DialogDescription>
            </DialogHeader>
            <form onSubmit={createPost} className="space-y-4">
              <p className="text-xs text-slate-400">작성자: {profile?.nickname} · {profile?.battleTag}</p>
              <label className="block space-y-1.5 text-sm text-slate-300">모집 제목
                <Input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={80} placeholder="예: 금요일 저녁 경쟁전 고정 멤버" />
              </label>
              <label className="block space-y-1.5 text-sm text-slate-300">모집 설명
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={3} placeholder="플레이 시간, 팀 분위기, 마이크 여부" className="w-full resize-y rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm text-slate-300">모집 목적
                  <select value={purpose} onChange={(event) => setPurpose(event.target.value as LfgPurpose)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{Object.entries(purposes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </label>
                <label className="text-sm text-slate-300">요구 포지션
                  <select value={position} onChange={(event) => setPosition(event.target.value as typeof position)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{selectablePositions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </label>
                <label className="text-sm text-slate-300">목표 티어
                  <select value={targetTier} onChange={(event) => setTargetTier(event.target.value as LfgRank)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{Object.entries(ranks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                </label>
                <label className="text-sm text-slate-300">팀 총 인원
                  <select value={totalMembers} onChange={(event) => setTotalMembers(Number(event.target.value))} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{[2, 3, 4, 5].map((count) => <option key={count} value={count}>{count}명 (작성자 포함)</option>)}</select>
                </label>
              </div>
              <label className="block space-y-1.5 text-sm text-slate-300">Discord ID <span className="text-slate-500">(선택)</span>
                <Input value={discordId} onChange={(event) => setDiscordId(event.target.value)} maxLength={40} placeholder="name 또는 name#0000" />
              </label>
              <label className="block space-y-1.5 text-sm text-slate-300">연락 배틀태그
                <Input value={contactBattleTag} onChange={(event) => setContactBattleTag(event.target.value)} placeholder={profile?.battleTag ?? "Player#1234"} />
              </label>
              <Button type="submit" className="w-full"><Users /> 모집글 등록</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs text-slate-400">목적<select aria-label="목적 필터" value={purposeFilter} onChange={(event) => setPurposeFilter(event.target.value as LfgPurpose | "all")} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100"><option value="all">전체 목적</option>{Object.entries(purposes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-slate-400">포지션<select aria-label="포지션 필터" value={positionFilter} onChange={(event) => setPositionFilter(event.target.value as LfgPosition)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{Object.entries(positions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-slate-400">티어<select aria-label="티어 필터" value={rankFilter} onChange={(event) => setRankFilter(event.target.value as LfgRank)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{Object.entries(ranks).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-xs text-slate-400">모집 상태<select aria-label="모집 상태 필터" value={openFilter} onChange={(event) => setOpenFilter(event.target.value as typeof openFilter)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100"><option value="open">모집 중</option><option value="closed">마감</option><option value="all">전체</option></select></label>
      </div>

      {error ? <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p> : null}
      {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />모집글 불러오는 중</div> : null}
      {!loading && posts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">조건에 맞는 모집글이 없습니다.</div> : null}
      <div className="grid gap-3 lg:grid-cols-2">
        {posts.map((post) => {
          const isOwner = post.isAuthor;
          const applied = post.hasApplied;
          const full = post.currentMembers >= post.totalMembers;
          return (
            <Card key={post.id} className="min-w-0">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-white">{post.title}</h3><span className={`rounded-md px-2 py-1 text-[11px] ${post.isOpen ? full ? "bg-amber-500/10 text-amber-300" : "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{!post.isOpen ? "마감" : full ? "정원 마감" : "모집 중"}</span></div>
                    <p className="mt-1 text-xs text-slate-400">{post.authorNickname} · {post.authorBattleTag} · {new Date(post.createdAt).toLocaleString("ko-KR")}</p>
                  </div>
                  <span className="shrink-0 rounded-md border border-orange-500/20 bg-orange-500/5 px-2 py-1 text-xs text-orange-200">{purposes[post.purpose]}</span>
                </div>
                {post.description ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{post.description}</p> : null}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <p>포지션 · <span className="text-slate-200">{positions[post.position]}</span></p>
                  <p>목표 티어 · <span className="text-slate-200">{ranks[post.targetTier]}</span></p>
                  <p>연락 BattleTag · <span className="text-slate-200">{post.contactBattleTag}</span></p>
                  <p>Discord · <span className="text-slate-200">{post.discordId || "미입력"}</span></p>
                </div>
                <div className="space-y-2 border-t border-slate-800 pt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400"><span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> 현재 인원 · 지원 {post.applicantCount}명</span><span className="font-semibold tabular-nums text-slate-200">{post.currentMembers} / {post.totalMembers}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-orange-400 transition-[width]" style={{ width: `${Math.min(100, post.currentMembers / post.totalMembers * 100)}%` }} /></div>
                </div>
                <div className="flex justify-end gap-2">
                  {isOwner && post.isOpen ? <Button type="button" size="sm" variant="outline" disabled={busyId === post.id} onClick={() => updatePost(post, "close")}><XCircle /> 마감</Button> : null}
                  {!isOwner && post.isOpen && !full ? <Button type="button" size="sm" variant={applied ? "outline" : "default"} disabled={!profile || applied || busyId === post.id} onClick={() => updatePost(post, "apply")}>{busyId === post.id ? <Loader2 className="animate-spin" /> : <UserPlus />}{applied ? "지원 완료" : "지원하기"}</Button> : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
