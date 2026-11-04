import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export type JudgeScore = {
  id: number;
  team_id: number;
  team_name: string;
  judge_name: string | null;
  is_guest_judge: boolean;
  total_score: number;
  max_score: number;
  notes: string | null;
  scored_at: string | null;
};

export type TeamTotal = { team_id: number; team_name: string; total: number; max: number; judge_count: number };

type Props = {
  teamTotals: TeamTotal[];
  scores: JudgeScore[];
  judgeCount: number;
  maxPerJudge: number;
};

/** Each team's combined score, with every judge's score and notes underneath. */
export default function JudgeScoresBreakdown({ teamTotals, scores, judgeCount, maxPerJudge }: Props) {
  const [openTeam, setOpenTeam] = useState<number | null>(null);
  if (teamTotals.length === 0) return null;
  const possible = judgeCount * maxPerJudge;

  return (
    <Card className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/10 dark:to-yellow-950/10 border-amber-200">
      <h4 className="text-xs font-bold uppercase text-amber-700 mb-2">Scores Awarded</h4>
      {teamTotals.map((t) => {
        const open = openTeam === t.team_id;
        const judges = scores.filter((s) => s.team_id === t.team_id);
        return (
          <div key={t.team_id} className="border-b border-amber-200/50 last:border-0">
            <button
              type="button"
              onClick={() => setOpenTeam(open ? null : t.team_id)}
              className="w-full flex items-center justify-between text-sm py-2 text-left"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Icon icon={open ? "chevron-down" : "chevron-right"} className="w-3.5 h-3.5 text-amber-600" />
                {t.team_name}
                <span className="text-[11px] font-normal text-muted-foreground">
                  {t.judge_count} of {judgeCount} judge{judgeCount === 1 ? "" : "s"}
                </span>
              </span>
              <span className="font-bold text-amber-700">{t.total}/{possible || t.max}</span>
            </button>
            {open && (
              <div className="pb-3 pl-5 space-y-2">
                {judges.map((j) => (
                  <div key={j.id} className="rounded-md bg-background/70 border border-amber-200/60 p-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {j.judge_name ?? "Judge"}
                        {j.is_guest_judge && <span className="ml-1.5 font-normal text-violet-600">Guest</span>}
                      </span>
                      <span className="font-bold">{j.total_score}/{j.max_score}</span>
                    </div>
                    {j.notes ? (
                      <p className="text-xs text-foreground/80 mt-1.5 whitespace-pre-line">{j.notes}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic mt-1">No notes</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </Card>
  );
}
