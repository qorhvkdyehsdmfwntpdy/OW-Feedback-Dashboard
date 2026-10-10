import { AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerAnalysis } from "@/lib/types";
import { cn } from "@/lib/utils";

interface FeedbackCardsProps {
  analyses: PlayerAnalysis[];
}

export function FeedbackCards({ analyses }: FeedbackCardsProps) {
  if (analyses.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-400">
          AI Coaching
        </p>
        <h2 className="text-2xl font-bold text-white">자동 코칭 리포트</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {analyses.map((item) => {
          const warning = item.coaching.tone === "warning";
          const excellent = item.coaching.tone === "excellent";
          return (
            <Card
              key={item.player.playerId}
              className={cn(
                "border-l-4",
                warning && "border-l-orange-500",
                excellent && "border-l-cyan-400",
                !warning && !excellent && "border-l-slate-500",
              )}
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  {warning ? (
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-cyan-300" />
                  )}
                  <span className={warning ? "text-orange-300" : "text-cyan-200"}>
                    {warning ? "경고 코칭" : excellent ? "우수 패턴" : "밸런스 가이드"}
                  </span>
                </div>
                <CardTitle className="text-base leading-snug">{item.coaching.headline}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-300">{item.coaching.summary}</p>
                <ul className="space-y-2">
                  {item.coaching.focus.map((line) => (
                    <li
                      key={line}
                      className="rounded-md bg-slate-800/80 px-3 py-2 text-sm text-slate-200"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
