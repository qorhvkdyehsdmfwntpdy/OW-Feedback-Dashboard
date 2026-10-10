"use client";

import { useState } from "react";
import { Cloud, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/types";
import type { LocalProfile } from "@/hooks/useLocalProfile";

interface CloudShareButtonProps {
  name: string;
  battleTags: string[];
  gamemode: GameMode;
  profile: LocalProfile | null;
  accessToken: string | null;
  onShareUrlChange?: (url: string) => void;
}

export function CloudShareButton({ name, battleTags, gamemode, profile, accessToken, onShareUrlChange }: CloudShareButtonProps) {
  const [saving, setSaving] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  async function createLink() {
    if (!name.trim() || battleTags.length !== 5 || battleTags.some((tag) => !/^.+[#-]\d{3,8}$/u.test(tag.trim()))) {
      toast.error("팀 이름과 5개의 유효한 배틀태그를 입력해 주세요.");
      return;
    }
    if (!accessToken) {
      toast.error("클라우드 공유를 사용하려면 Supabase 익명 인증이 준비되어야 합니다.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ name, battleTags, gamemode, ownerTag: profile?.battleTag }),
      });
      const payload = await response.json() as { team?: { id: string }; message?: string };
      if (!response.ok || !payload.team) throw new Error(payload.message ?? "공유 링크를 만들지 못했습니다.");
      const url = `${window.location.origin}/squad/${payload.team.id}`;
      setShareUrl(url);
      onShareUrlChange?.(url);
      await navigator.clipboard.writeText(url);
      toast.success("클라우드 스쿼드를 저장하고 링크를 복사했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "공유 링크를 만들지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("공유 링크를 복사했습니다.");
    } catch {
      toast.error("클립보드에 복사하지 못했습니다.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={createLink} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <Cloud />}
        {saving ? "링크 생성 중" : "클라우드 공유 링크 생성"}
      </Button>
      {shareUrl ? <Button type="button" variant="ghost" onClick={copyLink} title="공유 링크 복사" aria-label="공유 링크 복사"><Copy /> 복사 완료</Button> : null}
    </div>
  );
}
