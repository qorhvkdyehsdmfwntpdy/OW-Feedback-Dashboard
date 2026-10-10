import type { RoleKey } from "@/lib/types";

export type HeroRoleFilter = RoleKey | "all";

interface RoleFilterTabsProps {
  value: HeroRoleFilter;
  onChange: (role: HeroRoleFilter) => void;
}

const roles: Array<{ key: HeroRoleFilter; label: string }> = [
  { key: "all", label: "전체 영웅" },
  { key: "tank", label: "탱커" },
  { key: "damage", label: "딜러" },
  { key: "support", label: "힐러" },
];

export function RoleFilterTabs({ value, onChange }: RoleFilterTabsProps) {
  return (
    <div className="flex overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-1" role="group" aria-label="영웅 역할 필터">
      {roles.map((role) => (
        <button
          key={role.key}
          type="button"
          onClick={() => onChange(role.key)}
          aria-pressed={value === role.key}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${value === role.key ? "bg-orange-500/15 text-orange-200 shadow-sm" : "text-slate-400 hover:text-slate-100"}`}
        >
          {role.label}
        </button>
      ))}
    </div>
  );
}
