import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getRequestUser, getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const tierPoints: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const heroKey = new URL(request.url).searchParams.get("hero");
  if (!heroKey || !/^[a-z0-9-]{2,40}$/u.test(heroKey)) return NextResponse.json({ message: "영웅 키가 올바르지 않습니다." }, { status: 400 });
  const [{ data: comments, error: commentsError }, { data: rollups, error: rollupError }] = await Promise.all([
    supabase.from("hero_votes").select("comment,created_at").eq("hero_key", heroKey).order("created_at", { ascending: false }).limit(20),
    supabase.rpc("get_hero_vote_rollup"),
  ]);
  if (commentsError || rollupError) return NextResponse.json({ message: "커뮤니티 투표를 조회하지 못했습니다." }, { status: 500 });
  const summary = rollups?.find((vote) => vote.hero_key === heroKey);
  const count = summary?.vote_count ?? 0;
  const average = summary?.average_points ?? null;
  return NextResponse.json({
    heroKey,
    voteCount: count,
    averageTierPoints: average,
    averageTier: average === null ? null : average >= 4.5 ? "S" : average >= 3.5 ? "A" : average >= 2.5 ? "B" : average >= 1.5 ? "C" : "D",
    comments: (comments ?? []).filter((vote) => vote.comment.trim()).slice(0, 12).map((vote) => ({ comment: vote.comment, createdAt: vote.created_at })),
  }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ message: "Supabase 익명 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as { heroKey?: unknown; voterId?: unknown; tier?: unknown; comment?: unknown };
    if (typeof body.heroKey !== "string" || !/^[a-z0-9-]{2,40}$/u.test(body.heroKey)) return NextResponse.json({ message: "영웅 키가 올바르지 않습니다." }, { status: 400 });
    if (typeof body.voterId !== "string" || !/^.+[#-]\d{3,8}$/u.test(body.voterId.trim())) return NextResponse.json({ message: "프로필에 등록된 배틀태그가 필요합니다." }, { status: 401 });
    if (typeof body.tier !== "string" || !(body.tier in tierPoints)) return NextResponse.json({ message: "S~D 티어를 선택해 주세요." }, { status: 400 });
    const tier = body.tier as "S" | "A" | "B" | "C" | "D";
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 240) : "";
    const { error } = await supabase.from("hero_votes").upsert({ hero_key: body.heroKey, voter_id: body.voterId.trim(), user_id: user.id, tier, comment }, { onConflict: "hero_key,user_id" });
    if (error) throw error;
    return NextResponse.json({ saved: true }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "투표 저장에 실패했습니다. Supabase 테이블과 RLS 설정을 확인해 주세요." }, { status: 500 });
  }
}
