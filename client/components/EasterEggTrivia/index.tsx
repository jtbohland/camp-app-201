import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

const CORRECT_ANSWER = "nomnom";
const POINTS = 5;

type Props = {
  camperId: number;
  alreadyAnswered?: boolean;
};

export default function EasterEggTrivia({ camperId, alreadyAnswered = false }: Props) {
  const [expanded, setExpanded] = useState(!alreadyAnswered);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(alreadyAnswered);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const { run: awardPoints } = useApi("QuickAwardPoints");

  const handleSubmit = useCallback(async () => {
    if (!answer.trim()) return;
    const isCorrect = answer.trim().toLowerCase().replace(/\s+/g, "") === CORRECT_ANSWER;
    setCorrect(isCorrect);
    setSubmitted(true);

    if (isCorrect) {
      try {
        await awardPoints({
          camper_id: camperId,
          points: POINTS,
          reason: "🥚 Easter egg: Named the Amplitude mascot!",
          awarded_by: camperId,
          category: "bonus",
        });
        toast.success(`🥚 +${POINTS} hidden points earned!`);
      } catch {
        // Already answered or error
      }
    } else {
      toast("Not quite! But nice try 🏕️");
    }
  }, [answer, camperId, awardPoints]);

  if (submitted && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-xs text-camp-amber/70 hover:text-camp-amber transition-colors mb-3"
      >
        <span className="text-sm">🥚</span>
        {correct ? "You found the easter egg!" : "Easter egg trivia"}
      </button>
    );
  }

  return (
    <Card className="overflow-hidden border-camp-amber/20 bg-gradient-to-br from-amber-50/50 to-orange-50/30 mb-4">
      {/* Hero image with fun fact */}
      <div className="relative h-48 overflow-hidden">
        <img
          src="/office/201-building.jpg"
          alt="201 3rd Street — Amplitude HQ"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <p className="text-white/80 text-xs font-medium">📍 201 3rd Street, San Francisco</p>
          <p className="text-white text-sm font-bold mt-0.5">
            Did you know? cAMP 201 is named after our office building — it&apos;s literally where you level up! 🏔️
          </p>
        </div>
      </div>

      {/* Trivia section */}
      {!submitted ? (
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-camp-amber/15 flex items-center justify-center">
              <span className="text-xs">🥚</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Hidden Trivia Challenge</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-camp-amber/10 text-camp-amber font-semibold">+{POINTS} pts</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            You may have noticed a friendly little monster hanging around your cAMP 201 app. What&apos;s the name of Amplitude&apos;s beloved mascot?
          </p>
          <div className="flex gap-2">
            <Input
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type the mascot's name..."
              className="max-w-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="bg-camp-amber hover:bg-camp-amber/90 text-white"
            >
              Submit
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className={`flex items-start gap-3 rounded-lg p-3 ${correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className="text-lg mt-0.5">{correct ? "🎉" : "😅"}</div>
            <div>
              <p className={`text-sm font-semibold ${correct ? "text-green-700" : "text-red-700"}`}>
                {correct ? `Correct! +${POINTS} hidden points` : "Not quite!"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {correct
                  ? "That's NomNom! You'll see this little monster camping, hiking, and cheering you on throughout cAMP 201 🏕️"
                  : "The answer is NomNom — Amplitude's monster mascot! You'll see this little creature camping, hiking, and cheering you on throughout the app 🏕️"}
              </p>
            </div>
          </div>
          {expanded && submitted && (
            <button onClick={() => setExpanded(false)} className="text-xs text-muted-foreground mt-2 hover:text-foreground">
              Collapse
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
