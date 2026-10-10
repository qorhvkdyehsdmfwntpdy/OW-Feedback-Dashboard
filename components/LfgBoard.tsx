"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Loader2, Users, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LocalProfile } from "@/hooks/useLocalProfile";
import { getSupabaseClient } from "@/lib/supabase";

type Role = "tank" | "damage" | "support" | "any";
type Rank = "any" | "bronze" | "silver" | "gold" | "platinum" | "diamond" | "master" | "grandmaster" | "champion";
type GameMode = "competitive" | "quickplay";

interface LfgPost {
  id: string;
  author_tag: string;
  author_id: string;
  title: string;
  description: string;
  role: Role;
  rank: Rank;
  gamemode: GameMode;
  status: "open" | "closed";
  applicants: string[];
  created_at: string;
}

interface LfgBoardProps {
  profile: LocalProfile | null;
  accessToken: string | null;
  userId: string | null;
}

const roleLabels: Record<Role, string> = { tank: "탱커", damage: "딜러", support: "힐러", any: "전체 포지션" };
const rankLabels: Record<Rank, string> = { any: "전체 티어", bronze: "브론즈", silver: "실버", gold: "골드", platinum: "플래티넘", diamond: "다이아몬드", master: "마스터", grandmaster: "그랜드마스터", champion: "챔피언" };

export function LfgBoard({ profile, accessToken, userId }: LfgBoardProps) {
  const [posts, setPosts] = useState<LfgPost[]>([]);
  const [roleFilter, setRoleFilter] = useState<Role>("any");
  const [rankFilter, setRankFilter] = useState<Rank>("any");
  const [statusFilter, setStatusFilter] = useState<"open" | "closed" | "all">("open");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [role, setRole] = useState<Role>("any");
  const [rank, setRank] = useState<Rank>("any");
  const [gamemode, setGamemode] = useState<GameMode>("competitive");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const loadPosts = useCallback(async (signal?: AbortSignal) => {
    const params = new URLSearchParams();
    if (roleFilter !== "any") params.set("role", roleFilter);
    if (rankFilter !== "any") params.set("rank", rankFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    const response = await fetch(`/api/lfg?${params.toString()}`, { cache: "no-store", signal });
    const payload = await response.json() as { posts?: LfgPost[]; message?: string };
    if (!response.ok) throw new Error(payload.message ?? "LFG 목록 조회 실패");
    setPosts(payload.posts ?? []);
    setError("");
  }, [roleFilter, rankFilter, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      setLoading(true);
      void loadPosts(controller.signal).catch((loadError: unknown) => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : "LFG 목록을 불러오지 못했습니다.");
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [loadPosts]);

  useEffect(() => {
    const intervalId = window.setInterval(() => { void loadPosts().catch(() => undefined); }, 20_000);
    return () => window.clearInterval(intervalId);
  }, [loadPosts]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    const channel = supabase
      .channel("lfg-posts-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "lfg_posts" }, () => {
        void loadPosts().catch(() => undefined);
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadPosts]);

  async function createPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) {
      toast.error("글을 작성하려면 먼저 로컬 프로필을 등록해 주세요.");
      return;
    }
    if (!accessToken) {
      toast.error("Supabase 익명 인증이 준비되지 않았습니다.");
      return;
    }
    try {
      const response = await fetch("/api/lfg", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ authorTag: profile.battleTag, title, description, role, rank, gamemode }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "게시글 작성 실패");
      setTitle("");
      setDescription("");
      await loadPosts();
      toast.success("LFG 모집글을 등록했습니다.");
    } catch (postError) {
      toast.error(postError instanceof Error ? postError.message : "게시글 작성에 실패했습니다.");
    }
  }

  async function updatePost(post: LfgPost, action: "apply" | "close") {
    if (!profile) {
      toast.error("지원 또는 마감하려면 로컬 프로필을 등록해 주세요.");
      return;
    }
    if (!accessToken) {
      toast.error("Supabase 익명 인증이 준비되지 않았습니다.");
      return;
    }
    setBusyId(post.id);
    try {
      const response = await fetch(`/api/lfg/${post.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action, actorTag: profile.battleTag }),
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
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.6fr)]">
      <Card>
        <CardHeader><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Create Listing</p><CardTitle>스쿼드 모집글</CardTitle></CardHeader>
        <CardContent>
          {profile ? <form onSubmit={createPost} className="space-y-3">
            <p className="text-xs text-slate-400">작성자: {profile.nickname} · {profile.battleTag}</p>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={3} maxLength={80} placeholder="예: 다이아 경쟁전, 음성 가능" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={4} placeholder="플레이 시간, 팀 분위기, 마이크 여부" className="w-full resize-y rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-400">모집 포지션<select value={role} onChange={(event) => setRole(event.target.value as Role)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{(Object.keys(roleLabels) as Role[]).map((key) => <option key={key} value={key}>{roleLabels[key]}</option>)}</select></label>
              <label className="text-xs text-slate-400">희망 티어<select value={rank} onChange={(event) => setRank(event.target.value as Rank)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100">{(Object.keys(rankLabels) as Rank[]).map((key) => <option key={key} value={key}>{rankLabels[key]}</option>)}</select></label>
              <label className="col-span-2 text-xs text-slate-400">게임 모드<select value={gamemode} onChange={(event) => setGamemode(event.target.value as GameMode)} className="mt-1 h-10 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-100"><option value="competitive">경쟁전</option><option value="quickplay">빠른 대전</option></select></label>
            </div>
            <Button type="submit" className="w-full"><Users /> 모집글 등록</Button>
          </form> : <p className="text-sm leading-relaxed text-slate-400">모집글을 작성하려면 먼저 대시보드에서 로컬 프로필을 등록하세요. 프로필 등록은 계정 인증이 아닙니다.</p>}
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Looking For Group</p><h2 className="text-2xl font-bold text-white">그룹 찾기</h2><p className="mt-1 text-xs text-slate-500">목록은 20초 간격으로 갱신됩니다.</p></div>
          <div className="grid grid-cols-3 gap-2">
            <select aria-label="포지션 필터" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as Role)} className="h-10 min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100">{(Object.keys(roleLabels) as Role[]).map((key) => <option key={key} value={key}>{roleLabels[key]}</option>)}</select>
            <select aria-label="티어 필터" value={rankFilter} onChange={(event) => setRankFilter(event.target.value as Rank)} className="h-10 min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100">{(Object.keys(rankLabels) as Rank[]).map((key) => <option key={key} value={key}>{rankLabels[key]}</option>)}</select>
            <select aria-label="모집 상태 필터" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="h-10 min-w-0 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs text-slate-100"><option value="open">모집 중</option><option value="closed">마감</option><option value="all">전체</option></select>
          </div>
        </div>
        {error ? <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</p> : null}
        {loading ? <div className="flex items-center gap-2 py-12 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin" />모집글 불러오는 중</div> : null}
        {!loading && posts.length === 0 ? <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center text-sm text-slate-400">조건에 맞는 모집글이 없습니다.</div> : null}
        <div className="space-y-3">
          {posts.map((post) => {
            const applicants = Array.isArray(post.applicants) ? post.applicants : [];
            const isOwner = Boolean(userId && userId === post.author_id);
            const isApplicant = Boolean(userId && applicants.includes(userId));
            return <Card key={post.id} className="min-w-0">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-semibold text-white">{post.title}</h3><span className={`rounded-md px-2 py-1 text-[11px] ${post.status === "open" ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>{post.status === "open" ? "모집 중" : "마감"}</span></div><p className="mt-1 text-xs text-slate-400">{post.author_tag} · {new Date(post.created_at).toLocaleString("ko-KR")}</p></div>
                  <span className="shrink-0 text-xs text-slate-400">{post.gamemode === "competitive" ? "경쟁전" : "빠른 대전"}</span>
                </div>
                {post.description ? <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">{post.description}</p> : null}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-400">{roleLabels[post.role]} 모집 · {rankLabels[post.rank]} · 지원 {applicants.length}명</p>
                  <div className="flex gap-2">
                    {isOwner && post.status === "open" ? <Button type="button" size="sm" variant="outline" disabled={busyId === post.id} onClick={() => updatePost(post, "close")}><XCircle />마감</Button> : null}
                    {!isOwner && post.status === "open" ? <Button type="button" size="sm" variant={isApplicant ? "outline" : "default"} disabled={!profile || isApplicant || busyId === post.id} onClick={() => updatePost(post, "apply")}>{busyId === post.id ? <Loader2 className="animate-spin" /> : <UserPlus />}{isApplicant ? "지원 완료" : "지원하기"}</Button> : null}
                  </div>
                </div>
              </CardContent>
            </Card>;
          })}
        </div>
      </section>
    </div>
  );
}
