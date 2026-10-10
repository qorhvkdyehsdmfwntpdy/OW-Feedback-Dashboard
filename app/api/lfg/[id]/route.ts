import { NextResponse } from "next/server";
import { getRequestUser, getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ message: "Supabase 서버 환경 변수가 설정되지 않았습니다." }, { status: 503 });
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ message: "Supabase 익명 인증이 필요합니다." }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/iu.test(id)) return NextResponse.json({ message: "게시글 ID가 올바르지 않습니다." }, { status: 400 });
  try {
    const body = await request.json() as { action?: unknown };
    const { data: post, error: readError } = await supabase.from("lfg_posts").select("id,author_id,status").eq("id", id).maybeSingle();
    if (readError || !post) return NextResponse.json({ message: "게시글을 찾을 수 없습니다." }, { status: 404 });
    if (body.action === "close") {
      if (post.author_id !== user.id) return NextResponse.json({ message: "게시글 작성자만 마감할 수 있습니다." }, { status: 403 });
      const { error } = await supabase.from("lfg_posts").update({ status: "closed" }).eq("id", id).eq("author_id", user.id);
      if (error) throw error;
    } else if (body.action === "apply") {
      const { data: result, error } = await supabase.rpc("apply_lfg_post", { p_post_id: id, p_applicant_id: user.id });
      if (error) throw error;
      if (result === "closed") return NextResponse.json({ message: "마감된 모집글입니다." }, { status: 409 });
      if (result === "full") return NextResponse.json({ message: "모집 정원이 모두 찼습니다." }, { status: 409 });
      if (result === "owner") return NextResponse.json({ message: "작성자는 자신의 모집글에 지원할 수 없습니다." }, { status: 409 });
      if (result === "already_applied") return NextResponse.json({ message: "이미 지원한 모집글입니다." }, { status: 409 });
      if (result === "not_found") return NextResponse.json({ message: "모집글을 찾을 수 없습니다." }, { status: 404 });
    } else {
      return NextResponse.json({ message: "지원 또는 마감 동작을 선택해 주세요." }, { status: 400 });
    }
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ message: "게시글 상태를 변경하지 못했습니다." }, { status: 500 });
  }
}
