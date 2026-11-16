import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";
import BingoCounselorControls from "./BingoCounselorControls.js";
import BingoSquare, { type Square } from "./BingoSquare.js";

type Props = {
  presentationId: number;
  camperId: number;
  isAdmin?: boolean;
};

export default function FiresideFinder({ presentationId, camperId, isAdmin = false }: Props) {
  const [peeking, setPeeking] = useState(false);
  const { data, loading, fetching, refetch } = useApiData("GetBingoCard", {
    presentation_id: presentationId,
    camper_id: camperId,
    is_admin: isAdmin && peeking,
  }, { enabled: camperId > 0, refetchInterval: 30_000, placeholderData: (prev: any) => prev } as any);

  const { run: submitGuess, loading: guessing } = useApi("SubmitBingoGuess");
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);

  const card = (data?.card ?? []) as Square[];
  const found = (data?.found_squares ?? {}) as Record<string, number>;
  const camperNames = (data?.camper_names ?? []) as { id: number; first_name: string; last_name: string }[];
  const ownerNames = (data?.owner_names ?? {}) as Record<string, string>;
  const closed = data?.closed ?? false;
  const revealed = data?.revealed ?? false;
  const showAnswers = revealed || (isAdmin && peeking);
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
      if (result.penalty) toast.error(result.message);
      else if (result.correct) toast.success(result.message);
      else if (!result.success) toast.error(result.message);
      else toast(result.message);
      setSelectedSquare(null);
      refetch();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [selectedSquare, presentationId, camperId, submitGuess, refetch]);

  const handleSelect = useCallback((idx: number) => {
    setSelectedSquare((cur) => (cur === idx ? null : idx));
  }, []);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Generating your bingo card…</div>;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <BingoCounselorControls
          presentationId={presentationId}
          closed={closed}
          revealed={revealed}
          peeking={peeking}
          onPeekChange={setPeeking}
        />
      )}

      {closed && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-foreground">
          <Icon icon="flag" className="h-4 w-4 text-muted-foreground" />
          <span>
            <span className="font-semibold">Fireside Finder has ended.</span>{" "}
            {revealed ? "Here's who each square belonged to." : "No more guesses. Your score is final."}
          </span>
        </div>
      )}

      {/* Score header */}
      <Card className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
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
          {fetching && <span className="ml-auto text-xs text-muted-foreground">Updating…</span>}
        </div>
      </Card>

      {card.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          {closed ? "You didn't play this round." : "No card yet."}
        </Card>
      ) : (
        <div className="grid grid-cols-5 gap-1.5">
          {["F", "I", "R", "E", "S"].map((letter) => (
            <div key={letter} className="h-8 flex items-center justify-center rounded-lg bg-gradient-to-b from-amber-600 to-orange-600 text-white font-black text-lg">
              {letter}
            </div>
          ))}
          {card.map((sq) => {
            const isFound = found[String(sq.idx)] !== undefined || sq.is_free;
            return (
              <BingoSquare
                key={sq.idx}
                sq={sq}
                isFound={isFound}
                isSelected={selectedSquare === sq.idx}
                disabled={isFound || guessing || closed}
                answer={sq.owner_camper_id > 0 ? ownerNames[String(sq.owner_camper_id)] ?? null : null}
                showAnswers={showAnswers}
                onSelect={handleSelect}
              />
            );
          })}
        </div>
      )}

      {/* Guess dropdown — appears when a square is selected */}
      {selectedSquare !== null && !closed && (
        <Card className="p-4 border-amber-300 bg-amber-50/50 dark:bg-amber-950/10">
          <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Icon icon="search" className="w-4 h-4 text-amber-600" />
            Who told you this?
          </p>
          <p className="text-xs text-muted-foreground mb-3 italic">
            "{card.find((s) => s.idx === selectedSquare)?.fact}"
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
          <Button variant="ghost" size="sm" onClick={() => setSelectedSquare(null)} className="mt-2 text-xs text-muted-foreground">
            Cancel
          </Button>
        </Card>
      )}

      {!closed && (
        <Card className="p-3 bg-muted/30 border-dashed">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Rules:</strong> Approach one person at a time. Ask one question. If they match a square, tap it and select their name.
            If wrong, move on to a new person. First to BINGO wins!
          </p>
        </Card>
      )}
    </div>
  );
}
