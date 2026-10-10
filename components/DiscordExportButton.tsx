"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GameMode } from "@/lib/types";

interface DiscordExportButtonProps {
  teamName: string;
  battleTags: string[];
  gamemode: GameMode;
  shareUrl?: string;
  accessToken: string | null;
}

export function DiscordExportButton({ teamName, battleTags, gamemode, shareUrl, accessToken }: DiscordExportButtonProps) {
  const [sending, setSending] = useState(false);

  async function sendReport() {
    if (!accessToken) {
      toast.error("Discord 전송에는 Supabase 익명 인증이 필요합니다.");
      return;
    }
    if (battleTags.filter((tag) => tag.trim()).length === 0) {
      toast.error("먼저 배틀태그를 입력하고 스쿼드를 분석해 주세요.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/discord/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ teamName, battleTags, gamemode, shareUrl }),
      });
      const payload = await response.json() as { message?: string; playerCount?: number };
      if (!response.ok) throw new Error(payload.message ?? "Discord 전송에 실패했습니다.");
      toast.success(`Discord 채널에 ${payload.playerCount ?? 0}명 스쿼드 리포트를 전송했습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discord 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={sendReport} disabled={sending || battleTags.every((tag) => !tag.trim())}>
      {sending ? <Loader2 className="animate-spin" /> : <Send />}
      {sending ? "Discord 전송 중" : "Discord 채널로 리포트 전송"}
    </Button>
  );
}
