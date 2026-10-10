"use client";

import { useState, type FormEvent } from "react";
import { LogOut, UserRound, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { LocalProfile } from "@/hooks/useLocalProfile";

interface ProfileBarProps {
  profile: LocalProfile | null;
  hydrated: boolean;
  onRegister: (nickname: string, battleTag: string) => boolean;
  onLogout: () => boolean;
  onUseBattleTag: (battleTag: string) => void;
}

export function ProfileBar({ profile, hydrated, onRegister, onLogout, onUseBattleTag }: ProfileBarProps) {
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [battleTag, setBattleTag] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanNickname = nickname.trim();
    const cleanTag = battleTag.trim();
    if (!cleanNickname || !/^.+[#-]\d{3,8}$/u.test(cleanTag)) {
      setError("닉네임과 올바른 배틀태그(Player#1234)를 입력해 주세요.");
      return;
    }
    if (!onRegister(cleanNickname, cleanTag)) {
      setError("프로필을 브라우저에 저장하지 못했습니다. 저장 공간을 확인해 주세요.");
      return;
    }
    setError("");
    setOpen(false);
    toast.success(`${cleanNickname} 프로필을 이 브라우저에 등록했습니다.`);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3">
        {profile ? (
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300"><UserRound className="h-4 w-4" /></span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">안녕하세요, {profile.nickname}님!</p>
              <p className="truncate text-xs text-slate-400">{profile.battleTag} · 이 브라우저에 저장된 로컬 프로필</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => onUseBattleTag(profile.battleTag)}>
              내 태그 사용
            </Button>
          </div>
        ) : (
          <p className="text-sm text-slate-300">{hydrated ? "로컬 프로필을 등록해 개인 대시보드를 설정하세요." : "프로필 불러오는 중…"}</p>
        )}
        <div className="flex items-center gap-2">
          {profile ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => { if (onLogout()) toast.success("로컬 프로필에서 로그아웃했습니다."); }}>
              <LogOut className="h-4 w-4" /> 로그아웃
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => { setNickname(""); setBattleTag(""); setError(""); setOpen(true); }}>
              <UserRoundPlus className="h-4 w-4" /> 프로필 등록
            </Button>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>로컬 프로필 등록</DialogTitle>
            <DialogDescription>닉네임과 배틀태그를 현재 브라우저에 저장합니다. 비밀번호나 서버 계정은 생성되지 않습니다.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <label className="block space-y-1.5 text-sm text-slate-300">
              닉네임
              <Input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={32} autoComplete="nickname" placeholder="화면에 표시할 이름" />
            </label>
            <label className="block space-y-1.5 text-sm text-slate-300">
              내 배틀태그
              <Input value={battleTag} onChange={(event) => setBattleTag(event.target.value)} autoComplete="off" spellCheck={false} placeholder="Player#1234" />
            </label>
            {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}
            <Button type="submit" className="w-full">프로필 저장</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
