import { NextResponse } from "next/server";
import type { PlayerAnalysis } from "@/lib/types";
import type { SquadSynergyAnalysis } from "@/types/tier";
import { getRequestUser } from "@/lib/supabaseAdmin";

const recentSends = new Map<string, number>();

interface WebhookPayload {
  title?: unknown;
  gamemode?: unknown;
  analyses?: unknown;
  synergy?: unknown;
  shareUrl?: unknown;
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ message: "Supabase 익명 인증이 필요합니다." }, { status: 401 });
  const lastSentAt = recentSends.get(user.id) ?? 0;
  if (Date.now() - lastSentAt < 30_000) return NextResponse.json({ message: "Discord 리포트는 30초에 한 번만 전송할 수 있습니다." }, { status: 429 });
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return NextResponse.json({ message: "DISCORD_WEBHOOK_URL 환경 변수가 설정되지 않았습니다." }, { status: 503 });

  try {
    const body = await request.json() as WebhookPayload;
    const analyses = Array.isArray(body.analyses) ? body.analyses as PlayerAnalysis[] : [];
    if (analyses.length === 0 || analyses.length > 5) return NextResponse.json({ message: "전송할 스쿼드 분석 결과가 없습니다." }, { status: 400 });
    recentSends.set(user.id, Date.now());
    if (recentSends.size > 1000) {
      const expiry = Date.now() - 60_000;
      for (const [key, sentAt] of recentSends) if (sentAt < expiry) recentSends.delete(key);
    }
    const synergy = body.synergy && typeof body.synergy === "object" ? body.synergy as SquadSynergyAnalysis : null;
    const fields = analyses.map((analysis) => ({
      name: `${analysis.player.username} · ${analysis.player.mainRole.toUpperCase()}`,
      value: `OW-Score **${Math.round(analysis.owScore)}** · KDA ${analysis.player.kda.toFixed(2)} · 승률 ${analysis.player.winrate.toFixed(1)}%\n${analysis.styleTag.label}`,
      inline: true,
    }));
    const description = [
      synergy ? `**스쿼드 메타 부합도:** ${synergy.metaFitScore}/100 · **역할 구성:** ${synergy.rosterCoverageScore}/100` : "",
      typeof body.shareUrl === "string" ? `[스쿼드 리포트 열기](${body.shareUrl.slice(0, 500)})` : "",
    ].filter(Boolean).join("\n");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [{ title: String(body.title ?? "Overwatch Squad Report").slice(0, 250), description: description.slice(0, 4000) || undefined, color: 0xf97316, fields, footer: { text: `OW-Feedback-Dashboard · ${body.gamemode === "quickplay" ? "빠른 대전" : "경쟁전"}` }, timestamp: new Date().toISOString() }] }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return NextResponse.json({ message: `Discord webhook 요청이 실패했습니다 (${response.status}).` }, { status: 502 });
    return NextResponse.json({ sent: true });
  } catch {
    return NextResponse.json({ message: "Discord로 리포트를 전송하지 못했습니다." }, { status: 500 });
  }
}
