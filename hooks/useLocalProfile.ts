"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export const PROFILE_STORAGE_KEY = "ow_dashboard_profile";

export interface LocalProfile {
  battleTag: string;
  nickname: string;
  registeredAt: number;
}

function isLocalProfile(value: unknown): value is LocalProfile {
  if (typeof value !== "object" || value === null) return false;
  const profile = value as Partial<LocalProfile>;
  return typeof profile.battleTag === "string" && typeof profile.nickname === "string" && typeof profile.registeredAt === "number";
}

export function useLocalProfile() {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      if (active) setAccessToken(session?.access_token ?? null);
      if (active) setSupabaseUserId(session?.user.id ?? null);
    });
    void client.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        if (active) setAccessToken(data.session.access_token);
        if (active) setSupabaseUserId(data.session.user.id);
        return;
      }
      const { data: anonymous, error } = await client.auth.signInAnonymously();
      if (active && !error) {
        setAccessToken(anonymous.session?.access_token ?? null);
        setSupabaseUserId(anonymous.session?.user.id ?? null);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
        if (raw) {
          const parsed: unknown = JSON.parse(raw);
          if (isLocalProfile(parsed)) setProfile(parsed);
        }
      } catch {
        try {
          window.localStorage.removeItem(PROFILE_STORAGE_KEY);
        } catch {
          setProfile(null);
        }
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const register = useCallback((nickname: string, battleTag: string) => {
    const nextProfile: LocalProfile = {
      nickname: nickname.trim(),
      battleTag: battleTag.trim(),
      registeredAt: Date.now(),
    };
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile));
    } catch {
      return false;
    }
    setProfile(nextProfile);
    return true;
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    } catch {
      return false;
    }
    setProfile(null);
    return true;
  }, []);

  return { profile, hydrated, accessToken, supabaseUserId, register, logout };
}
