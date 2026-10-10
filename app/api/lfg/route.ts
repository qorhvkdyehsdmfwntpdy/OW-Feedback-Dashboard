import { NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { getRequestUser, getSupabaseAdminClient } from "@/lib/supabaseAdmin";

const roles = ["tank", "damage", "support", "any"] as const;
const ranks = ["any", "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster", "champion"] as const;
const validBattleTag = (value: unknown): value is string => typeof value === "string" && /^.+[#-]\d{3,8}$/u.test(value.trim());

export async function GET(request: Request) {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const params = new URL(request.url).searchParams;
  let query = supabase.from("lfg_posts").select("id,author_tag,author_id,title,description,role,rank,gamemode,status,applicants,created_at").order("created_at", { ascending: false }).limit(100);
  const role = params.get("role");
  const rank = params.get("rank");
  if (role && roles.includes(role as typeof roles[number]) && role !== "any") query = query.eq("role", role);
  if (rank && ranks.includes(rank as typeof ranks[number]) && rank !== "any") query = query.eq("rank", rank);
  const status = params.get("status");
  if (status === "open" || status === "closed") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ message: "LFG 게시글을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 서버 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ message: "Supabase 익명 인증이 필요합니다." }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!validBattleTag(body.authorTag)) return NextResponse.json({ message: "프로필에 등록된 배틀태그가 필요합니다." }, { status: 401 });
    if (typeof body.title !== "string" || body.title.trim().length < 3) return NextResponse.json({ message: "제목은 3자 이상 입력해 주세요." }, { status: 400 });
    const role = roles.includes(body.role as typeof roles[number]) ? body.role as typeof roles[number] : null;
    const rank = ranks.includes(body.rank as typeof ranks[number]) ? body.rank as typeof ranks[number] : null;
    if (!role || !rank) return NextResponse.json({ message: "포지션과 티어를 선택해 주세요." }, { status: 400 });
    const { data, error } = await supabase.from("lfg_posts").insert({
      author_tag: body.authorTag.trim(), author_id: user.id, title: body.title.trim().slice(0, 80),
      description: typeof body.description === "string" ? body.description.trim().slice(0, 500) : "",
      role, rank, gamemode: body.gamemode === "quickplay" ? "quickplay" : "competitive",
    }).select("id,author_tag,author_id,title,description,role,rank,gamemode,status,applicants,created_at").single();
    if (error) throw error;
    return NextResponse.json({ post: data }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "LFG 글 작성에 실패했습니다. Supabase 테이블과 RLS를 확인해 주세요." }, { status: 500 });
  }
}
