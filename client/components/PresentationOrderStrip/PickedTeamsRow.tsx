import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";

export type PickedTeam = {
  id: number;
  name: string;
  logo_url: string | null;
  color: string | null;
  position: number;
  is_up_now: boolean;
  score: { avg_total: number; max: number } | null;
  judges_scored: number;
};

type Props = {
  picked: PickedTeam[];
  hasRubric: boolean;
  judgesNeeded: number;
};

/** Teams that have gone (and who's up now), with each score once every judge has scored. */
export default function PickedTeamsRow({ picked, hasRubric, judgesNeeded }: Props) {
  if (picked.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-900/70">Order so far</p>
      <div className="flex flex-wrap gap-2">
        {picked.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${
              t.is_up_now ? "border-indigo-400 bg-white shadow-sm ring-2 ring-indigo-200" : "border-indigo-100 bg-white/70"
            }`}
          >
            <span className="text-xs font-bold text-indigo-500">#{t.position}</span>
            <TeamLogoBadge src={t.logo_url} name={t.name} color={t.color} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{t.name}</p>
              <ScoreLine team={t} hasRubric={hasRubric} judgesNeeded={judgesNeeded} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreLine({ team, hasRubric, judgesNeeded }: { team: PickedTeam; hasRubric: boolean; judgesNeeded: number }) {
  if (team.is_up_now && !team.score) {
    return <p className="text-[11px] font-semibold text-indigo-600">Presenting now</p>;
  }
  if (!hasRubric) return <p className="text-[11px] text-emerald-700">Done</p>;
  if (team.score) {
    return (
      <p className="text-[11px] font-semibold text-emerald-700">
        Score {team.score.avg_total} / {team.score.max}
      </p>
    );
  }
  return (
    <p className="text-[11px] text-muted-foreground">
      Waiting on judges ({Math.min(team.judges_scored, judgesNeeded)}/{judgesNeeded})
    </p>
  );
}
