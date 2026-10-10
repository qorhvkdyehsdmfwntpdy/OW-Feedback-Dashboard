"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { GameMode, PlayerAnalysis } from "@/lib/types";
import type { SquadSynergyAnalysis } from "@/types/tier";

interface DiscordSendButtonProps {
  title: string;
  gamemode: GameMode;
  analyses: PlayerAnalysis[];
  synergy: SquadSynergyAnalysis;
  shareUrl?: string;
  accessToken: string | null;
}

export function DiscordSendButton({ title, gamemode, analyses, synergy, shareUrl, accessToken }: DiscordSendButtonProps) {
  const [sending, setSending] = useState(false);

  async function sendReport() {
    if (!accessToken) {
      toast.error("Discord 전송에는 Supabase 익명 인증이 필요합니다.");
      return;
    }
    setSending(true);
    try {
      const response = await fetch("/api/discord/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ title, gamemode, analyses, synergy, shareUrl }),
      });
      const payload = await response.json() as { message?: string };
      if (!response.ok) throw new Error(payload.message ?? "Discord 전송에 실패했습니다.");
      toast.success("Discord 채널로 리포트를 전송했습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Discord 전송에 실패했습니다.");
    } finally {
      setSending(false);
    }
  }

  return <Button type="button" variant="outline" onClick={sendReport} disabled={sending || analyses.length === 0}>
    {sending ? <Loader2 className="animate-spin" /> : <Send />}
    {sending ? "Discord 전송 중" : "Discord 채널로 리포트 전송"}
  </Button>;
}
