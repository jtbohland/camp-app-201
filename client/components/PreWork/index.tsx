import { useCallback, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";
import { toast } from "sonner";

type PreworkItem = {
  key: string;
  icon: IconName;
  title: string;
  description: string;
  tip: string;
};

const PREWORK_ITEMS: PreworkItem[] = [
  {
    key: "challenger_sales",
    icon: "book-open",
    title: "Challenger Sales Training",
    description:
      "Complete the Challenger Sales fundamentals course in your LMS. Focus on the teaching, tailoring, and taking control principles.",
    tip: "Estimated time: 2-3 hours",
  },
  {
    key: "wheel_and_deal",
    icon: "target",
    title: "Wheel & Deal Practice",
    description:
      "Run through at least one full Wheel & Deal practice session. Record yourself and review your talk track before cAMP.",
    tip: "Estimated time: 1-2 hours",
  },
  {
    key: "ice_breaker_survey",
    icon: "message-circle",
    title: "Complete Ice Breaker Survey",
    description:
      "Fill out your Ice Breaker answers on your profile. These will be used in team activities during cAMP.",
    tip: "Go to My Profile → Ice Breaker section",
  },
];

type PreWorkProps = {
  userId: number;
  camperEmail: string;
  completedKeys: string[];
  onComplete: () => void;
};

export default function PreWork({ userId, camperEmail, completedKeys, onComplete }: PreWorkProps) {
  const { run: completeItem, loading: completing } = useApi("CompletePreworkItem");
  const [completingKey, setCompletingKey] = useState<string | null>(null);

  const handleComplete = useCallback(
    async (itemKey: string) => {
      setCompletingKey(itemKey);
      try {
        const result = await completeItem({
          user_id: userId,
          item: itemKey,
          email: camperEmail,
        });
        if (result && result.pointsAwarded > 0) {
          toast.success(`+${result.pointsAwarded} points earned! 🏕️`);
        }
        onComplete();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err);
        toast.error("Failed to mark complete: " + message);
      } finally {
        setCompletingKey(null);
      }
    },
    [userId, camperEmail, completeItem, onComplete]
  );

  const completedCount = completedKeys.length;
  const totalCount = PREWORK_ITEMS.length;
  const allDone = completedCount === totalCount;

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Icon icon="clipboard-check" className="w-5 h-5 text-camp-green" />
          Pre-Work
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount} completed
          </span>
          <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-camp-green transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {allDone && (
        <div className="mb-4 p-3 rounded-lg bg-camp-green/10 border border-camp-green/20 flex items-center gap-2">
          <Icon icon="check-circle" className="w-5 h-5 text-camp-green" />
          <span className="text-sm font-medium text-camp-green">
            All pre-work complete! +{totalCount * 5} points earned. You're summit-ready.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {PREWORK_ITEMS.map((item) => {
          const isCompleted = completedKeys.includes(item.key);
          const isCompletingThis = completingKey === item.key;

          return (
            <div
              key={item.key}
              className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                isCompleted
                  ? "bg-camp-green/5 border-camp-green/20"
                  : "bg-background border-border hover:border-camp-amber/30"
              }`}
            >
              {/* Status icon */}
              <div
                className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted
                    ? "bg-camp-green text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? (
                  <Icon icon="check" className="w-4 h-4" />
                ) : (
                  <Icon icon={item.icon} className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`text-sm font-semibold ${
                      isCompleted ? "text-camp-green" : "text-foreground"
                    }`}
                  >
                    {item.title}
                  </h3>
                  {isCompleted && (
                    <span className="text-xs text-camp-green font-medium">+5 pts</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {item.description}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1 italic">{item.tip}</p>
              </div>

              {/* Action */}
              <div className="flex-shrink-0">
                {isCompleted ? (
                  <div className="text-xs text-camp-green font-medium flex items-center gap-1">
                    <Icon icon="check-circle" className="w-4 h-4" />
                    Done
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-camp-green/30 text-camp-green hover:bg-camp-green hover:text-white"
                    onClick={() => handleComplete(item.key)}
                    disabled={completing && isCompletingThis}
                  >
                    {isCompletingThis ? (
                      <Icon icon="loader" className="w-3 h-3 animate-spin mr-1" />
                    ) : null}
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
