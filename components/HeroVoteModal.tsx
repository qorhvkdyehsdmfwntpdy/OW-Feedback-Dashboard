"use client";

import { useEffect, useState } from "react";
import { MessageSquareQuote, Send, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { LocalProfile } from "@/hooks/useLocalProfile";
import type { HeroMetaAnalysis, HeroTier } from "@/types/tier";

interface HeroVoteModalProps {
  hero: HeroMetaAnalysis;
  profile: LocalProfile | null;
  accessToken: string | null;
  onVoteSaved: () => void;
}

interface VoteSummary {
  voteCount: number;
  averageTier: HeroTier | null;
  comments: Array<{ comment: string; createdAt: string }>;
}

const tiers: HeroTier[] = ["S", "A", "B", "C", "D"];

export function HeroVoteModal({ hero, profile, accessToken, onVoteSaved }: HeroVoteModalProps) {
  const [open, setOpen] = useState(false);
  const [tier, setTier] = useState<HeroTier>(hero.tier);
  const [comment, setComment] = useState("");
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/votes?hero=${encodeURIComponent(hero.key)}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as VoteSummary;
        if (response.ok) setSummary(payload);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [open, hero.key]);

  async function submitVote() {
    if (!profile) {
      toast.error("투표하려면 먼저 브라우저 로컬 프로필을 등록해 주세요.");
      return;
    }
    if (!accessToken) {
      toast.error("Supabase 익명 인증이 준비되지 않았습니다. 환경 설정을 확인해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ heroKey: hero.key, voterId: profile.battleTag, tier, comment }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "투표를 저장하지 못했습니다.");
      toast.success("체감 티어를 저장했습니다.");
      setOpen(false);
      onVoteSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "투표 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button" variant="outline" className="w-full"><ThumbsUp /> 유저 체감 티어 투표</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{hero.name} 커뮤니티 메타</DialogTitle>
          <DialogDescription>통계 티어 {hero.tier} · 점수 {hero.metaScore.toFixed(1)}{summary ? ` · 투표 ${summary.voteCount}건` : ""} · 커뮤니티 평균 {summary?.averageTier ?? "아직 없음"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-300">체감 티어</legend>
            <div className="grid grid-cols-5 gap-2">
              {tiers.map((item) => <button key={item} type="button" aria-pressed={tier === item} onClick={() => setTier(item)} className={`h-11 rounded-lg border font-bold transition ${tier === item ? "border-orange-400 bg-orange-500/15 text-orange-200" : "border-slate-700 text-slate-300 hover:bg-slate-800"}`}>{item}</button>)}
            </div>
          </fieldset>
          <label className="block space-y-1.5 text-sm text-slate-300">한 줄 평가<Input value={comment} onChange={(event) => setComment(event.target.value)} maxLength={240} placeholder="최근 체감과 이유를 적어 주세요" /></label>
          <p className="text-xs leading-relaxed text-slate-500">로컬 프로필의 배틀태그로 투표를 덮어씁니다. 로컬 프로필은 인증 계정이 아니므로 투표자는 검증되지 않습니다.</p>
          <Button type="button" className="w-full" onClick={submitVote} disabled={saving}>{saving ? "저장 중" : <><Send /> 투표 저장</>}</Button>
          <div className="border-t border-slate-800 pt-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-200"><MessageSquareQuote className="h-4 w-4" />최근 코멘트</p>
            {summary?.comments.length ? <ul className="mt-2 space-y-2">{summary.comments.slice(0, 5).map((entry, index) => <li key={`${entry.createdAt}-${index}`} className="rounded-md bg-slate-800/70 p-2 text-sm text-slate-300">{entry.comment}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">아직 등록된 코멘트가 없습니다.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
