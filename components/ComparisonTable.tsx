import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PlayerAnalysis, RoleKey } from "@/lib/types";
import { PLAYER_COLORS } from "@/lib/types";

const ROLE_LABEL: Record<RoleKey, string> = {
  tank: "탱커",
  damage: "딜러",
  support: "지원",
};

interface ComparisonTableProps {
  analyses: PlayerAnalysis[];
}

function fmt(n: number, digits = 1): string {
  return n.toFixed(digits);
}

export function ComparisonTable({ analyses }: ComparisonTableProps) {
  if (analyses.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          Detail Table
        </p>
        <CardTitle>포지션 / 스탯 비교</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>플레이어</TableHead>
              <TableHead>포지션</TableHead>
              <TableHead>티어</TableHead>
              <TableHead className="text-right">승률</TableHead>
              <TableHead className="text-right">KDA</TableHead>
              <TableHead className="text-right">데스/10분</TableHead>
              <TableHead className="text-right">딜/10분</TableHead>
              <TableHead className="text-right">힐/10분</TableHead>
              <TableHead className="text-right">처치/10분</TableHead>
              <TableHead className="text-right">OW-Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analyses.map((item, index) => (
              <TableRow key={item.player.playerId}>
                <TableCell>
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PLAYER_COLORS[index % PLAYER_COLORS.length] }}
                    />
                    {item.player.username}
                  </span>
                </TableCell>
                <TableCell>{ROLE_LABEL[item.player.mainRole]}</TableCell>
                <TableCell>{item.player.competitiveLabel}</TableCell>
                <TableCell className="text-right">{fmt(item.player.winrate)}%</TableCell>
                <TableCell className="text-right">{fmt(item.player.kda, 2)}</TableCell>
                <TableCell className="text-right">{fmt(item.player.deathsPer10min)}</TableCell>
                <TableCell className="text-right">
                  {Math.round(item.player.damagePer10min).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {Math.round(item.player.healingPer10min).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{fmt(item.player.elimsPer10min)}</TableCell>
                <TableCell className="text-right font-bold text-orange-400">
                  {fmt(item.owScore, 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
