import { NextResponse } from "next/server";
import { fetchHeroMeta } from "@/lib/metaApi";
import type { MetaGamemode, MetaPlatform, MetaRegion } from "@/types/tier";

const platforms: MetaPlatform[] = ["pc", "console"];
const regions: MetaRegion[] = ["americas", "europe", "asia"];

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const mode: MetaGamemode = searchParams.get("gamemode") === "quickplay" ? "quickplay" : "competitive";
  const platformParam = searchParams.get("platform");
  const regionParam = searchParams.get("region");
  const platform = platforms.includes(platformParam as MetaPlatform) ? platformParam as MetaPlatform : "pc";
  const region = regions.includes(regionParam as MetaRegion) ? regionParam as MetaRegion : "americas";

  try {
    const dataset = await fetchHeroMeta({ mode, platform, region });
    return NextResponse.json(dataset, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return NextResponse.json(
      { message: "OverFast 영웅 메타 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
