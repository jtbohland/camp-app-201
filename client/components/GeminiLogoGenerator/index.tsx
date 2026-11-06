import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { executeApi } from "@/lib/executeApi.js";

type Slot = { status: "loading" | "done" | "error"; image?: string; message?: string };

type Props = {
  teamName: string;
  color: string;
  /** The raw Gemini image currently chosen, so its option stays highlighted. */
  selectedSource: string | null;
  onPick: (image: string) => void;
};

const OPTION_COUNT = 3;

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

export default function GeminiLogoGenerator({ teamName, color, selectedSource, onPick }: Props) {
  const [idea, setIdea] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const runId = useRef(0);

  // Ignore results that land after the editor closes.
  useEffect(() => () => { runId.current += 1; }, []);

  const generating = slots.some((s) => s.status === "loading");
  const canGenerate = !!teamName.trim() && !!idea.trim() && !generating;

  const generate = useCallback(() => {
    if (!teamName.trim() || !idea.trim()) return;
    const id = ++runId.current;
    setSlots(Array.from({ length: OPTION_COUNT }, () => ({ status: "loading" })));
    for (let variant = 0; variant < OPTION_COUNT; variant++) {
      executeApi("GenerateTeamLogo", { teamName: teamName.trim(), prompt: idea.trim(), color: color || "#2d6a4f", variant })
        .then((res) => (res.success && res.image
          ? { status: "done" as const, image: res.image }
          : { status: "error" as const, message: res.message || "No image returned" }))
        .catch((err) => ({ status: "error" as const, message: errorText(err) }))
        .then((slot) => {
          if (runId.current !== id) return;
          setSlots((prev) => prev.map((s, i) => (i === variant ? slot : s)));
        });
    }
  }, [teamName, idea, color]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground">
        Describe your logo idea. Gemini will draw {OPTION_COUNT} options using your team name and color.
      </p>
      <div className="flex gap-2">
        <input
          type="text"
          value={idea}
          maxLength={200}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="e.g. a fierce bear with a compass"
          className="flex-1 px-2.5 py-1.5 border border-border rounded-lg bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-purple-400/40"
          onKeyDown={(e) => e.key === "Enter" && canGenerate && generate()}
        />
        <button
          type="button"
          onClick={generate}
          disabled={!canGenerate}
          className="px-2.5 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <Icon icon={generating ? "loader-2" : slots.length ? "refresh-cw" : "sparkles"} className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
          {generating ? "Designing…" : slots.length ? "Try again" : "Generate"}
        </button>
      </div>
      {!teamName.trim() && <p className="text-[10px] text-amber-600">Add your team name above first.</p>}

      {slots.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot, i) => {
              const selected = slot.image && slot.image === selectedSource;
              if (slot.status === "loading") {
                return (
                  <div key={i} className="aspect-square rounded-lg border border-purple-200 bg-purple-50 flex flex-col items-center justify-center gap-1 animate-pulse">
                    <Icon icon="sparkles" className="w-4 h-4 text-purple-400" />
                    <span className="text-[10px] text-purple-500">Option {i + 1}</span>
                  </div>
                );
              }
              if (slot.status === "error") {
                return (
                  <div key={i} className="aspect-square rounded-lg border border-dashed border-border flex items-center justify-center p-2 text-center">
                    <span className="text-[10px] text-muted-foreground">{slot.message}</span>
                  </div>
                );
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onPick(slot.image!)}
                  aria-label={`Use logo option ${i + 1}`}
                  className={`relative aspect-square rounded-lg overflow-hidden border-2 bg-white transition-all ${
                    selected ? "border-purple-600 ring-2 ring-purple-300" : "border-border hover:border-purple-400"
                  }`}
                >
                  <img src={slot.image} alt={`Logo option ${i + 1}`} className="w-full h-full object-contain" />
                  {selected && (
                    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                      <Icon icon="check" className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">Click an option to use it as your logo.</p>
        </>
      )}
    </div>
  );
}
