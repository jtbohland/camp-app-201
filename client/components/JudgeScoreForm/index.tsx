import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Criterion = {
  name: string;
  levels: { score: number; label: string; desc: string }[];
};

type Member = { id: number; first_name: string; last_name: string };

type Props = {
  teamName: string;
  criteria: Criterion[];
  maxTotal: number;
  scores: Record<string, number>;
  notes: string;
  onNotesChange: (value: string) => void;
  members: Member[];
  mvpCamperId: string;
  onMvpChange: (value: string) => void;
  /** This judge already scored this team, so submitting replaces their score. */
  isRescore: boolean;
  saving: boolean;
  onSubmit: () => void;
};

/**
 * Bottom of the judge's scoring view for one team: notes, optional MVP, and the total.
 * Scores themselves are picked by tapping the rubric tiles above.
 */
export default function JudgeScoreForm(props: Props) {
  const { teamName, criteria, maxTotal, scores, notes, onNotesChange, members, mvpCamperId, onMvpChange, isRescore, saving, onSubmit } = props;
  const currentTotal = Object.values(scores).reduce((sum, v) => sum + v, 0);
  const scoredCount = criteria.filter((c) => scores[c.name] !== undefined).length;
  const complete = scoredCount >= criteria.length;

  return (
    <Card className="p-4 border-violet-200 bg-violet-50/30 dark:bg-violet-950/10">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Your score: {teamName}</h4>
        {isRescore && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Editing your score</span>
        )}
      </div>

      {/* Judge's notes, saved with the score for looking back later */}
      <div className="mt-3">
        <label htmlFor="judge-notes" className="flex items-center gap-2 mb-1.5 text-xs font-bold uppercase tracking-wide text-foreground">
          <Icon icon="notebook-pen" className="w-4 h-4 text-violet-500" /> Judge's notes
        </label>
        <Textarea
          id="judge-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Jot down notes while they present. Strengths, gaps, standout moments…"
          className="min-h-28 bg-background text-sm"
          maxLength={5000}
        />
        <p className="text-[10px] text-muted-foreground mt-1">
          Only counselors can see these. Your draft is kept on this device until you submit.
        </p>
      </div>

      {members.length > 0 && (
        <div className="mt-4 pt-3 border-t border-violet-200">
          <div className="flex items-center gap-2 mb-2">
            <Icon icon="award" className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wide">MVP — Most Valuable Presenter</span>
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-semibold">Optional</span>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
            Only pick an MVP if someone truly carried the team. Awards <strong>+10 individual pts</strong>, once per team.
          </p>
          <Select value={mvpCamperId || "none"} onValueChange={(v) => onMvpChange(v === "none" ? "" : v)}>
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="No MVP — team was evenly matched" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No MVP</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>{m.first_name} {m.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-violet-200">
        <div>
          <span className="text-sm font-bold">
            Team total: <span className="text-xl text-primary">{currentTotal}</span>/{maxTotal}
          </span>
          {!complete && (
            <p className="text-[11px] text-muted-foreground">
              {scoredCount} of {criteria.length} criteria scored. Tap a tile above for each one.
            </p>
          )}
        </div>
        <Button onClick={onSubmit} disabled={saving || !complete} size="sm">
          {saving ? "Saving…" : isRescore ? "Update My Score" : "Submit Score"}
        </Button>
      </div>
    </Card>
  );
}
