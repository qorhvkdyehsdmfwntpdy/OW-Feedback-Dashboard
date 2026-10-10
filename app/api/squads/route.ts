import { NextResponse } from "next/server";
import { getRequestUser, getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function validTag(tag: unknown): tag is string {
  return typeof tag === "string" && /^.+[#-]\d{3,8}$/u.test(tag.trim());
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 서버 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ message: "Supabase 익명 인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json() as { name?: unknown; battleTags?: unknown; gamemode?: unknown; ownerTag?: unknown };
    if (!Array.isArray(body.battleTags) || body.battleTags.length !== 5 || !body.battleTags.every(validTag)) {
      return NextResponse.json({ message: "공유 스쿼드에는 5개의 유효한 배틀태그가 필요합니다." }, { status: 400 });
    }
    const battleTags = body.battleTags.map((tag) => tag.trim());
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "";
    if (!name) return NextResponse.json({ message: "팀 이름을 입력해 주세요." }, { status: 400 });
    const gamemode = body.gamemode === "quickplay" ? "quickplay" : "competitive";
    const ownerTag = typeof body.ownerTag === "string" && validTag(body.ownerTag) ? body.ownerTag.trim() : null;
    const { data, error } = await supabase.from("squad_teams").insert({ name, battle_tags: battleTags, gamemode, owner_tag: ownerTag, owner_id: user.id, is_public: true }).select("id,name,battle_tags,gamemode,created_at").single();
    if (error) throw error;
    return NextResponse.json({ team: data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "공유 팀을 저장하지 못했습니다. Supabase 테이블과 RLS 설정을 확인해 주세요." }, { status: 500 });
  }
}
