"use client";

import { useCallback, useEffect, useState } from "react";

export const TEAM_STORAGE_KEY = "ow_squad_teams";

export interface SavedSquadTeam {
  id: string;
  name: string;
  battleTags: string[];
  savedAt: number;
}

function isSavedSquadTeam(value: unknown): value is SavedSquadTeam {
  if (typeof value !== "object" || value === null) return false;
  const team = value as Partial<SavedSquadTeam>;
  return (
    typeof team.id === "string" &&
    typeof team.name === "string" &&
    Array.isArray(team.battleTags) &&
    team.battleTags.length === 5 &&
    team.battleTags.every((tag) => typeof tag === "string") &&
    typeof team.savedAt === "number"
  );
}

export function useTeamStorage() {
  const [teams, setTeams] = useState<SavedSquadTeam[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(TEAM_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (Array.isArray(parsed)) setTeams(parsed.filter(isSavedSquadTeam));
        }
      } catch {
        try {
          window.localStorage.removeItem(TEAM_STORAGE_KEY);
        } catch {
          setTeams([]);
        }
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const persist = useCallback((nextTeams: SavedSquadTeam[]) => {
    try {
      window.localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(nextTeams));
    } catch {
      return false;
    }
    setTeams(nextTeams);
    return true;
  }, []);

  const saveTeam = useCallback(
    (name: string, battleTags: string[]) => {
      if (!hydrated) return false;
      const team: SavedSquadTeam = {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: name.trim(),
        battleTags: Array.from({ length: 5 }, (_, index) => battleTags[index]?.trim() ?? ""),
        savedAt: Date.now(),
      };
      return persist([team, ...teams]);
    },
    [hydrated, persist, teams],
  );

  const deleteTeam = useCallback(
    (teamId: string) => persist(teams.filter((team) => team.id !== teamId)),
    [persist, teams],
  );

  return { teams, hydrated, saveTeam, deleteTeam };
}
