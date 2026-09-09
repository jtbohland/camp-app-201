import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type Props = {
  presentationId: number;
  camperId: number;
  isAdmin?: boolean;
};

export default function FiresideFinder({ presentationId, camperId, isAdmin = false }: Props) {
  const { data, loading, refetch } = useApiData("GetBingoCard", {
    presentation_id: presentationId,
    camper_id: camperId,
    is_admin: isAdmin,
  }, { enabled: camperId > 0 });

  const { run: submitGuess, loading: guessing } = useApi("SubmitBingoGuess");
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const card = (data?.card ?? []) as any[];
  const found = (data?.found_squares ?? {}) as Record<string, number>;
  const camperNames = (data?.camper_names ?? []) as { id: number; first_name: string; last_name: string }[];
  const score = data?.score ?? 0;
  const bingosCount = (data?.bingos_claimed ?? []).length;
  const foundCount = Object.keys(found).length;

  const handleGuess = useCallback(async (guessedCamperId: number) => {
    if (selectedSquare === null) return;
    try {
      const result = await submitGuess({
        presentation_id: presentationId,
        camper_id: camperId,
        square_idx: selectedSquare,
        guessed_camper_id: guessedCamperId,
      });
      if (!result) return;
      if (result.penalty) {
        toast.error(result.message);
      } else if (result.correct) {
        toast.success(result.message);
      } else {
        toast(result.message);
      }
      setSelectedSquare(null);
      refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [selectedSquare, presentationId, camperId, submitGuess, refetch]);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Generating your bingo card…</div>;

  // Group card into 5x5 grid
  const grid: any[][] = [];
  for (let r = 0; r < 5; r++) {
    grid.push(card.slice(r * 5, r * 5 + 5));
  }

  return (
    <div className="space-y-4">
      {/* Score header */}
      <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{score}</p>
              <p className="text-[10px] uppercase font-bold text-amber-600/60">Points</p>
            </div>
            <div className="w-px h-8 bg-amber-300 dark:bg-amber-700" />
            <div className="text-center">
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{foundCount}</p>
              <p className="text-[10px] uppercase font-bold text-amber-600/60">Found</p>
            </div>
            <div className="w-px h-8 bg-amber-300 dark:bg-amber-700" />
            <div className="text-center">
              <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{bingosCount}</p>
              <p className="text-[10px] uppercase font-bold text-amber-600/60">Bingos</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReveal(!showReveal)}
              className="text-xs"
            >
              <Icon icon={showReveal ? "eye-off" : "eye"} className="w-3.5 h-3.5 mr-1" />
              {showReveal ? "Hide Answers" : "Reveal Answers"}
            </Button>
          )}
        </div>
      </Card>

      {/* Bingo Grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* Header row */}
        {["F","I","R","E","S"].map((letter) => (
          <div key={letter} className="h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-amber-600 to-orange-600 text-white font-black text-lg">
            {letter}
          </div>
        ))}

        {/* Grid squares */}
        {grid.flat().map((sq: any) => {
          const isFound = found[String(sq.idx)] !== undefined || sq.is_free;
          const isSelected = selectedSquare === sq.idx;
          const ownerName = isAdmin && showReveal
            ? camperNames.find((c) => c.id === sq.owner_camper_id)
            : null;

          return (
            <button
              key={sq.idx}
              disabled={isFound || guessing}
              onClick={() => sq.is_free ? null : setSelectedSquare(isSelected ? null : sq.idx)}
              className={`
                relative aspect-square rounded-lg p-1.5 text-[10px] leading-tight font-medium transition-all
                flex flex-col items-center justify-center text-center overflow-hidden
                ${isFound
                  ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md"
                  : isSelected
                    ? "bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500 ring-2 ring-amber-300"
                    : "bg-card border border-border hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                }
              `}
            >
              {isFound ? (
                <span className="text-2xl">🔥</span>
              ) : (
                <span className="line-clamp-4 px-0.5">{sq.fact}</span>
              )}
              {/* Admin reveal overlay */}
              {isAdmin && showReveal && ownerName && !isFound && (
                <span className="absolute bottom-0 inset-x-0 bg-violet-600 text-white text-[8px] px-1 py-0.5 truncate">
                  {ownerName.first_name} {ownerName.last_name[0]}.
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Guess dropdown — appears when a square is selected */}
      {selectedSquare !== null && (
        <Card className="p-4 border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Icon icon="search" className="w-4 h-4 text-amber-600" />
            Who told you this?
          </p>
          <p className="text-xs text-muted-foreground mb-3 italic">
            "{card.find((s: any) => s.idx === selectedSquare)?.fact}"
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
            {camperNames.map((c) => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                disabled={guessing}
                onClick={() => handleGuess(c.id)}
                className="text-xs justify-start h-auto py-1.5 px-2"
              >
                {c.first_name} {c.last_name[0]}.
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSquare(null)}
            className="mt-2 text-xs text-muted-foreground"
          >
            Cancel
          </Button>
        </Card>
      )}

      {/* Instructions reminder */}
      <Card className="p-3 bg-muted/30 border-dashed">
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Rules:</strong> Approach one person at a time. Ask one question. If they match a square, tap it and select their name.
          If wrong, move to a new person — <span className="text-red-500 font-semibold">picking the same person twice in a row = -2 pts!</span>
        </p>
      </Card>
    </div>
  );
}
