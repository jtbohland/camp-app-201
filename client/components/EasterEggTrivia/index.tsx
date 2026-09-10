import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

type TriviaQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  revealText: string;
  points: number;
  category: string;
};

const TRIVIA: TriviaQuestion = {
  question: "Look closely at the photo — what coffee chain is hiding in the lobby of 201 3rd Street?",
  options: ["Peet's Coffee", "Blue Bottle", "Starbucks", "Philz Coffee"],
  correctIndex: 2,
  revealText: "That's right! There's a Starbucks right in the lobby. Pro tip: fuel up before sessions start ☕",
  points: 5,
  category: "bonus",
};

type Props = {
  camperId: number;
  alreadyAnswered?: boolean;
};

export default function EasterEggTrivia({ camperId, alreadyAnswered = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(alreadyAnswered);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const { run: awardPoints } = useApi("QuickAwardPoints");

  const handleSubmit = useCallback(async () => {
    if (selected === null) return;
    const isCorrect = selected === TRIVIA.correctIndex;
    setCorrect(isCorrect);
    setSubmitted(true);

    if (isCorrect) {
      try {
        await awardPoints({
          camper_id: camperId,
          points: TRIVIA.points,
          reason: "🥚 Easter egg: 201 Building Trivia",
          awarded_by: camperId,
          category: TRIVIA.category,
        });
        toast.success(`🥚 +${TRIVIA.points} hidden points earned!`);
      } catch {
        // Already answered or error — no big deal
      }
    } else {
      toast("Not quite! But nice try 🏕️");
    }
  }, [selected, camperId, awardPoints]);

  if (submitted && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-xs text-camp-amber/70 hover:text-camp-amber transition-colors"
      >
        <Icon icon="egg" className="w-3.5 h-3.5" />
        {correct ? "You found the easter egg! 🥚" : "Easter egg trivia"}
      </button>
    );
  }

  return (
    <Card className="overflow-hidden border-camp-amber/20 bg-gradient-to-br from-amber-50/50 to-orange-50/30">
      {/* Fun fact header with 201 photo */}
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
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-camp-amber/10 text-camp-amber font-semibold">+{TRIVIA.points} pts</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">{TRIVIA.question}</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {TRIVIA.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                  selected === i
                    ? "border-camp-amber bg-camp-amber/10 text-camp-amber font-medium"
                    : "border-muted hover:border-camp-amber/30 text-muted-foreground"
                }`}
              >
                ☕ {opt}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={selected === null}
              className="bg-camp-amber hover:bg-camp-amber/90 text-white"
            >
              Submit Answer
            </Button>
            {!alreadyAnswered && (
              <Button size="sm" variant="ghost" onClick={() => setExpanded(false)} className="text-muted-foreground">
                Maybe later
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className={`flex items-start gap-3 rounded-lg p-3 ${correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className="text-lg mt-0.5">{correct ? "🎉" : "😅"}</div>
            <div>
              <p className={`text-sm font-semibold ${correct ? "text-green-700" : "text-red-700"}`}>
                {correct ? `Correct! +${TRIVIA.points} hidden points` : "Not quite!"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {correct ? TRIVIA.revealText : `The answer was ${TRIVIA.options[TRIVIA.correctIndex]}. ${TRIVIA.revealText}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
