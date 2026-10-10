import { NextResponse } from "next/server";
import { getRequestUser, getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { LfgPosition, LfgPurpose, LfgRank, LfgPost } from "@/types/lfg";

const positions: LfgPosition[] = ["tank", "damage", "healer", "support", "any"];
const ranks: LfgRank[] = ["any", "bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster", "champion"];
const purposes: LfgPurpose[] = ["scrim", "competitive", "quickplay"];
const validBattleTag = (value: unknown): value is string => typeof value === "string" && /^.+[#-]\d{3,8}$/u.test(value.trim());

function toLfgPost(row: {
  id: string;
  author_id: string;
  author_nickname: string;
  author_tag: string;
  title: string;
  description: string;
  purpose: LfgPurpose;
  role: LfgPosition;
  rank: LfgRank;
  current_members: number;
  total_members: number;
  discord_id: string | null;
  contact_battle_tag: string | null;
  created_at: string;
  status: "open" | "closed";
}, userId: string | null, hasApplied: boolean): LfgPost {
  return {
    id: row.id,
    authorNickname: row.author_nickname,
    authorBattleTag: row.author_tag,
    title: row.title,
    description: row.description,
    purpose: row.purpose,
    position: row.role,
    targetTier: row.rank,
    currentMembers: row.current_members,
    totalMembers: row.total_members,
    discordId: row.discord_id,
    contactBattleTag: row.contact_battle_tag ?? row.author_tag,
    createdAt: row.created_at,
    isOpen: row.status === "open",
    applicantCount: Math.max(0, row.current_members - 1),
    isAuthor: userId !== null && userId === row.author_id,
    hasApplied,
  };
}

export async function GET(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 서버 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const user = await getRequestUser(request);
  const params = new URL(request.url).searchParams;
  let query = supabase.from("lfg_posts")
    .select("id,author_id,author_nickname,author_tag,title,description,purpose,role,rank,current_members,total_members,discord_id,contact_battle_tag,created_at,status")
    .order("created_at", { ascending: false })
    .limit(100);
  const position = params.get("position");
  const targetTier = params.get("targetTier");
  const purpose = params.get("purpose");
  const isOpen = params.get("isOpen");
  const selectedPosition = position as LfgPosition | null;
  const selectedTier = targetTier as LfgRank | null;
  const selectedPurpose = purpose as LfgPurpose | null;
  if (selectedPosition && positions.includes(selectedPosition) && selectedPosition !== "any") query = query.eq("role", selectedPosition);
  if (selectedTier && ranks.includes(selectedTier) && selectedTier !== "any") query = query.eq("rank", selectedTier);
  if (selectedPurpose && purposes.includes(selectedPurpose)) query = query.eq("purpose", selectedPurpose);
  if (isOpen === "true") query = query.eq("status", "open");
  if (isOpen === "false") query = query.eq("status", "closed");
  const { data, error } = await query;
  if (error) return NextResponse.json({ message: "LFG 게시글을 불러오지 못했습니다." }, { status: 500 });
  const rows = data ?? [];
  const applications = user && rows.length
    ? await supabase.from("lfg_applications").select("post_id").eq("user_id", user.id).in("post_id", rows.map((row) => row.id))
    : { data: [], error: null };
  if (applications.error) return NextResponse.json({ message: "LFG 지원 상태를 불러오지 못했습니다." }, { status: 500 });
  const appliedPosts = new Set((applications.data ?? []).map((application) => application.post_id));
  return NextResponse.json({ posts: rows.map((row) => toLfgPost(row, user?.id ?? null, appliedPosts.has(row.id))) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 서버 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ message: "Supabase 익명 인증이 필요합니다." }, { status: 401 });

  try {
    const body = await request.json() as Record<string, unknown>;
    if (!validBattleTag(body.authorBattleTag)) return NextResponse.json({ message: "프로필에 등록된 배틀태그가 필요합니다." }, { status: 400 });
    if (typeof body.authorNickname !== "string" || body.authorNickname.trim().length === 0) return NextResponse.json({ message: "작성자 닉네임을 입력해 주세요." }, { status: 400 });
    if (typeof body.title !== "string" || body.title.trim().length < 3) return NextResponse.json({ message: "제목은 3자 이상 입력해 주세요." }, { status: 400 });
    const purpose = purposes.includes(body.purpose as LfgPurpose) ? body.purpose as LfgPurpose : null;
    const position = positions.includes(body.position as LfgPosition) && body.position !== "any" ? body.position as LfgPosition : null;
    const targetTier = ranks.includes(body.targetTier as LfgRank) ? body.targetTier as LfgRank : null;
    const totalMembers = typeof body.totalMembers === "number" && Number.isInteger(body.totalMembers) ? body.totalMembers : 0;
    if (!purpose || !position || !targetTier || totalMembers < 2 || totalMembers > 5) {
      return NextResponse.json({ message: "모집 목적, 포지션, 티어, 총 인원(2~5명)을 확인해 주세요." }, { status: 400 });
    }
    const discordId = typeof body.discordId === "string" ? body.discordId.trim().slice(0, 40) : "";
    const contactBattleTag = validBattleTag(body.contactBattleTag) ? body.contactBattleTag.trim() : body.authorBattleTag.trim();
    const gamemode = purpose === "quickplay" ? "quickplay" : "competitive";
    const { data, error } = await supabase.from("lfg_posts").insert({
      author_tag: body.authorBattleTag.trim(),
      author_nickname: body.authorNickname.trim().slice(0, 40),
      author_id: user.id,
      title: body.title.trim().slice(0, 80),
      description: typeof body.description === "string" ? body.description.trim().slice(0, 500) : "",
      purpose,
      role: position,
      rank: targetTier,
      gamemode,
      status: "open",
      current_members: 1,
      total_members: totalMembers,
      discord_id: discordId || null,
      contact_battle_tag: contactBattleTag,
    }).select("id,author_id,author_nickname,author_tag,title,description,purpose,role,rank,current_members,total_members,discord_id,contact_battle_tag,created_at,status").single();
    if (error) throw error;
    return NextResponse.json({ post: toLfgPost(data, user.id, false) }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "LFG 글 작성에 실패했습니다. 새 LFG 마이그레이션이 적용되었는지 확인해 주세요." }, { status: 500 });
  }
}
