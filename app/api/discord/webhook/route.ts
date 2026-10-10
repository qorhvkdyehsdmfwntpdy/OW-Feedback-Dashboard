import { NextResponse } from "next/server";
import { analyzeSquad } from "@/lib/calculator";
import { fetchSquadStats } from "@/lib/api";
import { fetchHeroMeta } from "@/lib/metaApi";
import { analyzeSquadSynergy } from "@/lib/synergyAnalyzer";
import { getRequestUser } from "@/lib/supabaseAdmin";
import type { GameMode } from "@/lib/types";

const recentSends = new Map<string, number>();

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ message: "Supabase 익명 인증이 필요합니다." }, { status: 401 });
  const lastSentAt = recentSends.get(user.id) ?? 0;
  if (Date.now() - lastSentAt < 30_000) return NextResponse.json({ message: "Discord 리포트는 30초에 한 번만 전송할 수 있습니다." }, { status: 429 });
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return NextResponse.json({ message: "DISCORD_WEBHOOK_URL 환경 변수가 설정되지 않았습니다." }, { status: 503 });

  try {
    const body = await request.json() as { battleTags?: unknown; gamemode?: unknown; teamName?: unknown; shareUrl?: unknown };
    const battleTags = Array.isArray(body.battleTags)
      ? body.battleTags.filter((tag): tag is string => typeof tag === "string" && /^.+[#-]\d{3,8}$/u.test(tag.trim())).slice(0, 5).map((tag) => tag.trim())
      : [];
    if (battleTags.length === 0) return NextResponse.json({ message: "전송할 유효한 배틀태그가 없습니다." }, { status: 400 });

    const gamemode: GameMode = body.gamemode === "quickplay" ? "quickplay" : "competitive";
    const { players, errors } = await fetchSquadStats(battleTags, gamemode);
    if (players.length === 0) return NextResponse.json({ message: "공개 전적을 불러온 플레이어가 없습니다." }, { status: 422 });
    const analyses = analyzeSquad(players);
    let metaFitScore: number | null = null;
    try {
      const meta = await fetchHeroMeta({ mode: gamemode, platform: "pc", region: "americas" });
      metaFitScore = analyzeSquadSynergy(analyses, meta.heroes).metaFitScore;
    } catch {
      metaFitScore = null;
    }

    const averageScore = analyses.reduce((sum, analysis) => sum + analysis.owScore, 0) / analyses.length;
    const fields = analyses.map((analysis) => ({
      name: `${analysis.player.username} · ${analysis.player.battleTag}`.slice(0, 256),
      value: [
        `**OW-Score ${Math.round(analysis.owScore)}** · ${analysis.player.competitiveLabel}`,
        `승률 ${analysis.player.winrate.toFixed(1)}% · KDA ${analysis.player.kda.toFixed(2)} · 데스 ${analysis.player.deathsPer10min.toFixed(1)}/10분`,
        `처치 ${analysis.player.elimsPer10min.toFixed(1)} · 피해 ${Math.round(analysis.player.damagePer10min).toLocaleString()} · 치유 ${Math.round(analysis.player.healingPer10min).toLocaleString()}/10분`,
        analysis.styleTag.label,
      ].join("\n").slice(0, 1024),
      inline: true,
    }));
    fields.push({
      name: "스쿼드 요약",
      value: `평균 OW-Score **${averageScore.toFixed(1)}** · 메타 부합도 **${metaFitScore === null ? "조회 불가" : `${metaFitScore}/100`}** · 분석 ${analyses.length}/${battleTags.length}명`,
      inline: false,
    });
    if (errors.length) fields.push({ name: "조회 실패", value: errors.map((error) => error.battleTag).join(", ").slice(0, 1024), inline: false });

    let shareLink = "";
    if (typeof body.shareUrl === "string") {
      try {
        const parsed = new URL(body.shareUrl);
        if (parsed.protocol === "https:" || parsed.protocol === "http:") shareLink = `[전체 리포트 열기](${parsed.toString().slice(0, 500)})`;
      } catch {
        shareLink = "";
      }
    }
    const title = typeof body.teamName === "string" && body.teamName.trim()
      ? body.teamName.trim().slice(0, 240)
      : "Overwatch Squad Report";
    const description = [
      `${gamemode === "quickplay" ? "빠른 대전" : "경쟁전"} 분석 · ${new Date().toLocaleString("ko-KR")}`,
      shareLink,
    ].filter(Boolean).join("\n");
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allowed_mentions: { parse: [] },
        embeds: [{ title, description, color: 0xf97316, fields, footer: { text: "OW-Feedback-Dashboard · OverFast stats" }, timestamp: new Date().toISOString() }],
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return NextResponse.json({ message: `Discord webhook 요청이 실패했습니다 (${response.status}).` }, { status: 502 });
    recentSends.set(user.id, Date.now());
    if (recentSends.size > 1000) {
      const expiry = Date.now() - 60_000;
      for (const [id, timestamp] of recentSends) if (timestamp < expiry) recentSends.delete(id);
    }
    return NextResponse.json({ sent: true, playerCount: analyses.length, averageScore: Number(averageScore.toFixed(1)), metaFitScore });
  } catch {
    return NextResponse.json({ message: "Discord로 리포트를 전송하지 못했습니다." }, { status: 500 });
  }
}
