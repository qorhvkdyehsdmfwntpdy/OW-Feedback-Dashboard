"use client";

import { FormEvent, useState } from "react";
import { Gamepad2, Loader2, Search, ShieldAlert, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { GameMode, SquadPlayerError } from "@/lib/types";
import type { SavedSquadTeam } from "@/hooks/useTeamStorage";

interface BattleTagFormProps {
  tags: string[];
  loading: boolean;
  errors: SquadPlayerError[];
  gamemode: GameMode;
  teams: SavedSquadTeam[];
  onGamemodeChange: (gamemode: GameMode) => void;
  onTagsChange: (tags: string[]) => void;
  onSaveTeam: (name: string, tags: string[]) => boolean;
  onDeleteTeam: (teamId: string) => boolean;
  onSubmit: () => void;
  onClearErrors: () => void;
}

export function BattleTagForm({
  tags,
  loading,
  errors,
  gamemode,
  teams,
  onGamemodeChange,
  onTagsChange,
  onSaveTeam,
  onDeleteTeam,
  onSubmit,
  onClearErrors,
}: BattleTagFormProps) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  function updateTag(index: number, value: string) {
    const next = [...tags];
    next[index] = value;
    onTagsChange(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const filled = tags.map((tag) => tag.trim()).filter(Boolean);
    if (filled.length === 0) {
      setLocalError("최소 1명의 배틀태그를 Player#1234 형식으로 입력해 주세요.");
      return;
    }
    const invalid = filled.find((tag) => !/^.+[#-]\d{3,8}$/u.test(tag));
    if (invalid) {
      setLocalError(`"${invalid}" 형식이 올바르지 않습니다. Player#1234로 입력해 주세요.`);
      return;
    }
    setLocalError(null);
    onClearErrors();
    onSubmit();
  }

  function handleSaveTeam() {
    if (!teamName.trim()) {
      setLocalError("저장할 팀 이름을 입력해 주세요.");
      return;
    }
    if (!tags.some((tag) => tag.trim())) {
      setLocalError("저장할 배틀태그를 한 명 이상 입력해 주세요.");
      return;
    }
    if (onSaveTeam(teamName, tags)) {
      setLocalError(null);
      setSelectedTeamId("");
    } else {
      setLocalError("팀을 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
    }
  }

  function handleTeamSelect(teamId: string) {
    setSelectedTeamId(teamId);
    const selected = teams.find((team) => team.id === teamId);
    if (selected) {
      onTagsChange([...selected.battleTags]);
      setTeamName(selected.name);
    }
  }

  const modalOpen = Boolean(localError) || errors.length > 0;

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-700/80 bg-slate-900/60 p-6 shadow-xl shadow-black/40"
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
              Squad Input
            </p>
            <h2 className="text-2xl font-bold text-white">5인 배틀태그</h2>
            <p className="mt-1 text-sm text-slate-400">
              `Player#1234` 형식으로 입력하면 OverFast 조회용 ID로 자동 변환됩니다.
            </p>
          </div>
          <div className="flex shrink-0 rounded-lg border border-slate-700 bg-slate-950/70 p-1" role="group" aria-label="게임 모드 선택">
            <Button
              type="button"
              size="sm"
              variant={gamemode === "competitive" ? "default" : "ghost"}
              aria-pressed={gamemode === "competitive"}
              onClick={() => onGamemodeChange("competitive")}
            >
              <Shield className="h-4 w-4" /> 경쟁전
            </Button>
            <Button
              type="button"
              size="sm"
              variant={gamemode === "quickplay" ? "default" : "ghost"}
              aria-pressed={gamemode === "quickplay"}
              onClick={() => onGamemodeChange("quickplay")}
            >
              <Gamepad2 className="h-4 w-4" /> 빠른 대전
            </Button>
          </div>
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            스쿼드 분석
          </Button>
        </div>

        <div className="mb-5 grid gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              aria-label="팀 이름"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="저장할 팀 이름"
              maxLength={40}
            />
            <Button type="button" variant="outline" onClick={handleSaveTeam}>
              💾 현재 스쿼드 저장
            </Button>
          </div>
          <div className="flex gap-2">
            <select
              aria-label="저장된 팀 불러오기"
              value={selectedTeamId}
              onChange={(event) => handleTeamSelect(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">📂 저장된 팀 불러오기</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <Button
              type="button"
              variant="outline"
              aria-label="선택한 팀 삭제"
              title="선택한 팀 삭제"
              disabled={!selectedTeamId}
              onClick={() => {
                if (selectedTeamId && onDeleteTeam(selectedTeamId)) setSelectedTeamId("");
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          {tags.map((tag, index) => (
            <label key={index} className="block space-y-1.5">
              <span className="text-xs font-medium text-slate-400">플레이어 {index + 1}</span>
              <Input
                value={tag}
                onChange={(event) => updateTag(index, event.target.value)}
                placeholder="Player#1234"
                autoComplete="off"
                spellCheck={false}
              />
            </label>
          ))}
        </div>
      </form>

      <Dialog
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setLocalError(null);
            onClearErrors();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <ShieldAlert className="h-5 w-5" />
              프로필을 불러오지 못했습니다
            </DialogTitle>
            <DialogDescription>
              존재하지 않거나 비공개 프로필은 건너뛰고 나머지 스쿼드만 분석합니다. 앱이 중단되지
              않습니다.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            {localError ? (
              <li className="rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-orange-100">
                {localError}
              </li>
            ) : null}
            {errors.map((error) => (
              <li
                key={error.battleTag}
                className="rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2"
              >
                <span className="font-semibold text-white">{error.battleTag}</span>
                <span className="mt-0.5 block text-orange-100">{error.message}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
