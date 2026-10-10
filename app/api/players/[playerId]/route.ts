import { NextRequest, NextResponse } from "next/server";
import { fetchPlayerStats, PlayerFetchError } from "@/lib/api";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ playerId: string }> },
) {
  const { playerId } = await context.params;

  try {
    const player = await fetchPlayerStats(playerId);
    return NextResponse.json({ player });
  } catch (error) {
    if (error instanceof PlayerFetchError) {
      return NextResponse.json(
        {
          error: error.code,
          message: error.message,
          battleTag: error.battleTag,
        },
        { status: error.code === "rate_limited" ? 429 : 404 },
      );
    }

    return NextResponse.json(
      {
        error: "unknown",
        message: "해당 유저는 비공개 프로필입니다",
        battleTag: playerId,
      },
      { status: 500 },
    );
  }
}
