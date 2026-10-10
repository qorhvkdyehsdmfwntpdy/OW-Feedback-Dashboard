import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) return NextResponse.json({ message: "공유 링크가 올바르지 않습니다." }, { status: 400 });
  const { data, error } = await supabase.from("squad_teams").select("id,name,battle_tags,gamemode,created_at").eq("id", id).eq("is_public", true).maybeSingle();
  if (error) return NextResponse.json({ message: "공유 스쿼드를 조회하지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ message: "공유 스쿼드를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ team: data }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
