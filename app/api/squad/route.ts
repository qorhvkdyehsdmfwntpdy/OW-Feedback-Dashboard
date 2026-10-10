import { NextResponse } from "next/server";
import { fetchSquadStats } from "@/lib/api";
import { analyzeSquad } from "@/lib/calculator";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { battleTags?: string[] };
    const battleTags = Array.isArray(body.battleTags) ? body.battleTags.slice(0, 5) : [];

    if (battleTags.length === 0) {
      return NextResponse.json(
        { message: "배틀태그를 입력해 주세요." },
        { status: 400 },
      );
    }

    const { players, errors } = await fetchSquadStats(battleTags);
    const analyses = analyzeSquad(players);

    return NextResponse.json({ analyses, errors });
  } catch {
    return NextResponse.json(
      { message: "스쿼드 분석 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
