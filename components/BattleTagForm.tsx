"use client";

import { Loader2, Search, ShieldAlert } from "lucide-react";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SquadPlayerError } from "@/lib/types";

interface BattleTagFormProps {
  tags: string[];
  loading: boolean;
  errors: SquadPlayerError[];
  onTagsChange: (tags: string[]) => void;
  onSubmit: () => void;
  onClearErrors: () => void;
}

export function BattleTagForm({
  tags,
  loading,
  errors,
  onTagsChange,
  onSubmit,
  onClearErrors,
}: BattleTagFormProps) {
  const [localError, setLocalError] = useState<string | null>(null);

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
    const invalid = filled.find((tag) => !tag.includes("#") && !tag.includes("-"));
    if (invalid) {
      setLocalError(`"${invalid}" 형식이 올바르지 않습니다. Player#1234로 입력해 주세요.`);
      return;
    }
    setLocalError(null);
    onSubmit();
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
          <Button type="submit" size="lg" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            스쿼드 분석
          </Button>
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
