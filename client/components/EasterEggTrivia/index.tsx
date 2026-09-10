import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

const CORRECT_ANSWER = "nomnom";
const POINTS = 5;
const EASTER_EGG_REASON = "Easter egg: Named the Amplitude mascot";

type Props = {
  camperId: number;
  teamId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function EasterEggTrivia({ camperId, teamId, open, onOpenChange }: Props) {
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [alreadyFound, setAlreadyFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { run: awardPoints } = useApi("QuickAwardPoints");

  const handleSubmit = useCallback(async () => {
    if (!answer.trim()) return;
    const isCorrect = answer.trim().toLowerCase().replace(/\s+/g, "") === CORRECT_ANSWER;
    setCorrect(isCorrect);
    setSubmitted(true);

    if (isCorrect) {
      try {
        const result = await awardPoints({
          camper_id: camperId,
          points: POINTS,
          reason: EASTER_EGG_REASON,
          awarded_by: camperId,
          category: "bonus",
          team_unique: true,
        });
        if (result?.already_found) {
          setAlreadyFound(true);
        } else {
          toast.success(`+${POINTS} hidden points earned!`);
        }
      } catch {
        // Error — still show correct UI
      }
    }
  }, [answer, camperId, awardPoints]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogTitle className="sr-only">Hidden Challenge</DialogTitle>

        {/* Hero image */}
        <div className="relative h-40 overflow-hidden">
          <img
            src="/office/201-building.jpg"
            alt="201 3rd Street"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="text-white/70 text-xs font-medium">201 3rd Street, San Francisco</p>
            <p className="text-white text-sm font-bold mt-0.5">
              You found something hidden...
            </p>
          </div>
        </div>

        {!submitted ? (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="search" className="w-4 h-4 text-amber-600" />
              <p className="text-sm font-bold text-foreground">Hidden Trivia Challenge</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">+{POINTS} pts</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              You may have noticed a friendly little monster hanging around your cAMP 201 app.
            </p>
            <p className="text-sm text-foreground font-medium mb-3">
              What's the name of Amplitude's beloved mascot?
            </p>
            {teamId && (
              <p className="text-[10px] text-muted-foreground/60 mb-3 italic">
                Only the first person on your team to answer correctly earns the points.
              </p>
            )}
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type the mascot's name..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={!answer.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Submit
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            {correct && alreadyFound ? (
              /* Teammate already found it */
              <div className="flex items-start gap-3 rounded-lg p-3 bg-blue-50 border border-blue-200">
                <Icon icon="info" className="w-5 h-5 mt-0.5 text-blue-500" />
                <div>
                  <p className="text-sm font-semibold text-blue-700">Your teammate already found this!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    That's NomNom — great answer! But a teammate already discovered this easter egg, so the +{POINTS} pts were already awarded to your team.
                  </p>
                </div>
              </div>
            ) : (
              <div className={`flex items-start gap-3 rounded-lg p-3 ${correct ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <Icon icon={correct ? "check-circle" : "x-circle"} className={`w-5 h-5 mt-0.5 ${correct ? "text-green-600" : "text-red-500"}`} />
                <div>
                  <p className={`text-sm font-semibold ${correct ? "text-green-700" : "text-red-700"}`}>
                    {correct ? `Correct! +${POINTS} hidden points` : "Not quite!"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {correct
                      ? "That's NomNom! You'll see this little monster camping, hiking, and cheering you on throughout cAMP 201."
                      : "The answer is NomNom — Amplitude's monster mascot! Better luck next time."}
                  </p>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="mt-3 w-full"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
