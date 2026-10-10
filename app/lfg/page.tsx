"use client";

import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import { LfgBoard } from "@/components/LfgBoard";
import { ProfileBar } from "@/components/ProfileBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLocalProfile } from "@/hooks/useLocalProfile";
import { toast } from "sonner";

export default function LfgPage() {
  const { profile, hydrated, accessToken, register, logout } = useLocalProfile();

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> 대시보드</Link>
          <ThemeToggle />
        </div>
        <header className="space-y-3"><p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-orange-400"><Users className="h-4 w-4" /> Squad Finder</p><h1 className="text-3xl font-bold text-white">그룹 찾기</h1><p className="max-w-2xl text-sm leading-relaxed text-slate-400">Supabase에 저장된 모집글에서 포지션과 경쟁전 티어에 맞는 팀을 찾아보세요.</p></header>
        <ProfileBar profile={profile} hydrated={hydrated} onRegister={register} onLogout={logout} onUseBattleTag={() => toast.info("LFG 페이지에서는 내 태그를 모집글 작성자 정보로 사용합니다.")} />
        <LfgBoard profile={profile} accessToken={accessToken} />
      </div>
    </main>
  );
}
