import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  revealed: boolean;
  scoreCount: number;
  onToggle: () => void;
};

/** EBR / capstone: keep scores hidden until every team has presented. */
export default function ScoreRevealToggle({ revealed, scoreCount, onToggle }: Props) {
  return (
    <Card className={`p-4 border-2 ${revealed ? "border-green-400 bg-green-50/50" : "border-amber-400 bg-amber-50/50"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{revealed ? "🏆" : "🔒"}</span>
          <div>
            <h4 className="font-bold text-sm">{revealed ? "Scores Revealed!" : "Scores Locked"}</h4>
            <p className="text-xs text-muted-foreground">
              {revealed
                ? "All EBR scores are visible on the leaderboard"
                : `${scoreCount} judge score(s) submitted. Reveal when all teams have presented`}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={revealed ? "outline" : "default"}
          onClick={onToggle}
          className={revealed ? "" : "bg-amber-600 hover:bg-amber-700"}
        >
          {revealed ? "Re-lock Scores" : "🏆 Reveal Scores"}
        </Button>
      </div>
    </Card>
  );
}
