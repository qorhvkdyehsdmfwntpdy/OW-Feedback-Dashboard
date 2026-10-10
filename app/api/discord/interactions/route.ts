import { NextResponse } from "next/server";
import { fetchPlayerStats } from "@/lib/api";
import { analyzePlayer } from "@/lib/calculator";
import { analyzeSquadSynergy } from "@/lib/synergyAnalyzer";
import { fetchHeroMeta } from "@/lib/metaApi";
import { buildPlayerEmbed, verifyDiscordSignature } from "@/server/discordBot";

interface DiscordOption {
  name?: string;
  value?: string;
}

interface DiscordInteraction {
  type?: number;
  data?: { name?: string; options?: DiscordOption[] };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyDiscordSignature(rawBody, request.headers.get("x-signature-ed25519"), request.headers.get("x-signature-timestamp"))) {
    return NextResponse.json({ message: "Invalid Discord interaction signature." }, { status: 401 });
  }

  let interaction: DiscordInteraction;
  try {
    interaction = JSON.parse(rawBody) as DiscordInteraction;
  } catch {
    return NextResponse.json({ message: "Invalid interaction body." }, { status: 400 });
  }

  if (interaction.type === 1) return NextResponse.json({ type: 1 });
  if (interaction.type !== 2 || interaction.data?.name !== "squad") {
    return NextResponse.json({ type: 4, data: { content: "지원하지 않는 명령입니다.", flags: 64 } });
  }

  const battleTag = interaction.data.options?.find((option) => option.name === "battletag")?.value?.trim();
  if (!battleTag || !/^.+[#-]\d{3,8}$/u.test(battleTag)) {
    return NextResponse.json({ type: 4, data: { content: "배틀태그를 Player#1234 형식으로 입력해 주세요.", flags: 64 } });
  }

  try {
    const player = await fetchPlayerStats(battleTag, "competitive");
    const analysis = analyzePlayer(player);
    const meta = await fetchHeroMeta({ mode: "competitive", platform: "pc", region: "americas" });
    const squadMeta = analyzeSquadSynergy([analysis], meta.heroes);
    const embed = buildPlayerEmbed(analysis, squadMeta.metaFitScore);
    return NextResponse.json({ type: 4, data: { embeds: [embed], flags: 64 } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "전적을 불러오지 못했습니다.";
    return NextResponse.json({ type: 4, data: { content: message.slice(0, 1500), flags: 64 } });
  }
}
