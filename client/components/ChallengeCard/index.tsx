import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Challenge } from "@/lib/wheelData.js";

type Props = {
  challenge: Challenge;
};

export default function ChallengeCard({ challenge }: Props) {
  return (
    <Card className="p-6 border-2" style={{ borderColor: challenge.product.color + "40" }}>
      {/* Challenge type header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{challenge.typeIcon}</span>
        <div>
          <Badge
            className="text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: challenge.product.color + "15", color: challenge.product.color, border: `1px solid ${challenge.product.color}30` }}
          >
            {challenge.typeLabel}
          </Badge>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-lg">{challenge.product.icon}</span>
            <span className="text-sm font-semibold text-foreground">{challenge.product.name}</span>
          </div>
        </div>
      </div>

      {/* Prompt */}
      <div className="bg-muted/50 rounded-lg p-4 mb-3">
        <p className="text-base font-medium text-foreground whitespace-pre-line leading-relaxed">
          {challenge.prompt}
        </p>
      </div>

      {/* Hint */}
      <div className="flex items-start gap-2 text-sm text-muted-foreground">
        <span className="shrink-0 mt-0.5">💡</span>
        <p className="italic">{challenge.hint}</p>
      </div>

      {/* Reframe (shown for objection type, hidden until coach reveals) */}
      {challenge.type === "objection" && challenge.objectionReframe && (
        <details className="mt-4">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            🔍 Show reframe (for coach)
          </summary>
          <p className="mt-2 text-sm text-foreground/80 bg-green-50 border border-green-200 rounded-lg p-3 leading-relaxed">
            {challenge.objectionReframe}
          </p>
        </details>
      )}
    </Card>
  );
}
