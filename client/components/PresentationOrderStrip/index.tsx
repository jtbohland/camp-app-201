import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { toast } from "sonner";

const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];
const ORDINAL_COLORS = [
  "bg-amber-100 text-amber-800 border-amber-300",
  "bg-gray-100 text-gray-700 border-gray-300",
  "bg-orange-100 text-orange-700 border-orange-300",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-green-50 text-green-700 border-green-200",
  "bg-purple-50 text-purple-700 border-purple-200",
];

type OrderItem = { position: number; team_id: number; team_name: string };

type Props = {
  isAdmin: boolean;
  cohortId: number;
};

export default function PresentationOrderStrip({ isAdmin, cohortId }: Props) {
  const [shuffling, setShuffling] = useState(false);

  const { data, refetch } = useApiData("GetPresentationOrder", {});
  const { run: randomize } = useApi("RandomizePresentationOrder");
  const { run: clearOrder } = useApi("ClearPresentationOrder");

  const isActive = data?.active ?? false;
  const label = data?.label ?? null;
  const order = (data?.order ?? []) as OrderItem[];

  const handleShuffle = useCallback(async () => {
    setShuffling(true);
    try {
      await randomize({
        cohort_id: cohortId,
        presentation_label: "Current Presentation",
      });
      toast.success("🎲 Teams shuffled!");
      refetch();
    } catch {
      toast.error("Failed to shuffle");
    } finally {
      setShuffling(false);
    }
  }, [cohortId, randomize, refetch]);

  const handleClear = useCallback(async () => {
    try {
      await clearOrder({});
      toast.success("Order cleared");
      refetch();
    } catch {
      toast.error("Failed to clear");
    }
  }, [clearOrder, refetch]);

  return (
    <div className="space-y-2">
      {/* Admin controls */}
      {isAdmin && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleShuffle}
            disabled={shuffling}
            size="sm"
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white"
          >
            <Icon icon="shuffle" className="w-3.5 h-3.5 mr-1.5" />
            {shuffling ? "Shuffling..." : "🎲 Randomize Order"}
          </Button>
        </div>
      )}

      {/* Order strip */}
      {isActive && order.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
          <span className="text-sm font-bold text-indigo-800 mr-1">🎤 Presenting:</span>
          <div className="flex items-center gap-1.5 flex-wrap flex-1">
            {order.map((item, idx) => (
              <Badge
                key={item.team_id}
                className={`text-xs font-semibold border px-2.5 py-0.5 ${ORDINAL_COLORS[idx] ?? ORDINAL_COLORS[3]}`}
              >
                {ORDINALS[idx] ?? `${idx + 1}th`} — {item.team_name}
              </Badge>
            ))}
          </div>
          {isAdmin && (
            <Button
              onClick={handleClear}
              variant="ghost"
              size="sm"
              className="text-indigo-400 hover:text-red-500 hover:bg-red-50 ml-auto shrink-0"
            >
              <Icon icon="x" className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
