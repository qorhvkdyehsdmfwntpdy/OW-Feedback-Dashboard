import "server-only";
import { createPublicKey, verify } from "node:crypto";
import type { PlayerAnalysis } from "@/lib/types";

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function verifyDiscordSignature(rawBody: string, signature: string | null, timestamp: string | null): boolean {
  const publicKeyHex = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKeyHex || !signature || !timestamp || !/^[0-9a-f]{128}$/iu.test(signature) || !/^[0-9a-f]{64}$/iu.test(publicKeyHex)) return false;
  const requestTime = Number(timestamp);
  if (!Number.isFinite(requestTime) || Math.abs(Date.now() / 1000 - requestTime) > 300) return false;
  try {
    const key = createPublicKey({ key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(publicKeyHex, "hex")]), format: "der", type: "spki" });
    return verify(null, Buffer.from(`${timestamp}${rawBody}`), key, Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

export function buildPlayerEmbed(analysis: PlayerAnalysis, metaFitScore: number) {
  const { player } = analysis;
  return {
    title: `${player.username} · OW-Score ${Math.round(analysis.owScore)}`,
    description: `${analysis.styleTag.label}\n${player.competitiveLabel}`,
    color: 0xf97316,
    fields: [
      { name: "역할 / 게임", value: `${player.mainRole.toUpperCase()} · ${player.gamesPlayed}판`, inline: true },
      { name: "승률 / KDA", value: `${player.winrate.toFixed(1)}% · ${player.kda.toFixed(2)}`, inline: true },
      { name: "데스 / 10분", value: player.deathsPer10min.toFixed(1), inline: true },
      { name: "모스트 메타 부합도", value: `${metaFitScore}/100`, inline: true },
      { name: "코칭", value: analysis.coaching.summary.slice(0, 900), inline: false },
    ],
    footer: { text: "OW-Feedback-Dashboard · OverFast player stats" },
  };
}
