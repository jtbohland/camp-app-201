import { useCallback, useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { IconName } from "lucide-react/dynamic";
import { toast } from "sonner";
import PreWorkWarningModal from "@/components/PreWorkWarningModal/index.js";
import DeadlineCountdown from "@/components/DeadlineCountdown/index.js";
import WheelAndDealForm from "@/components/WheelAndDealForm";
import ChallengerUpload from "@/components/ChallengerUpload";

type Link = { label: string; url: string };
type ContentItem = {
  id: number;
  icon: string;
  title: string;
  content: string;
  tip: string | null;
  links: Link[];
  is_checkable: boolean;
  item_key: string | null;
};

type PreWorkProps = {
  userId: number;
  camperEmail: string;
  camperRole?: string;
  completedKeys: string[];
  onComplete: () => void;
  isAdmin?: boolean;
  deadline?: string;
};

export default function PreWork({ userId, camperEmail, camperRole, completedKeys, onComplete, isAdmin, deadline }: PreWorkProps) {
  const { run: completeItem, loading: completing } = useApi("CompletePreworkItem");
  const { run: trackClick } = useApi("TrackLinkClick");
  const [completingKey, setCompletingKey] = useState<string | null>(null);
  const [warningItem, setWarningItem] = useState<ContentItem | null>(null);
  const [missingLinks, setMissingLinks] = useState<Link[]>([]);
  const [missingProfileFields, setMissingProfileFields] = useState<string[]>([]);
  const [submittedForms, setSubmittedForms] = useState<Set<string>>(new Set());

  const { data, loading } = useApiData("GetJourneyContent", {
    section: "prework",
    camper_id: userId,
  }, { enabled: userId > 0 });

  const items = useMemo(() => {
    return ((data?.items ?? []) as any[]).map((item: any) => ({
      ...item,
      links: Array.isArray(item.links) ? item.links : [],
    })) as ContentItem[];
  }, [data]);

  const clickedLinks = useMemo(() => {
    const set = new Set<string>();
    ((data?.clicked_links ?? []) as any[]).forEach((c: any) => {
      set.add(`${c.content_id}:${c.link_url}`);
    });
    return set;
  }, [data]);

  const handleLinkClick = useCallback(async (contentId: number, url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    try {
      await trackClick({ camper_id: userId, content_id: contentId, link_url: url });
    } catch {
      // non-blocking
    }
  }, [userId, trackClick]);

  const handleComplete = useCallback(async (item: ContentItem, force: boolean) => {
    if (!item.item_key) return;
    setCompletingKey(item.item_key);
    try {
      const result = await completeItem({
        user_id: userId,
        item: item.item_key,
        content_id: item.id,
        force,
      });

      if (result?.warning) {
        setWarningItem(item);
        setMissingLinks(result.missing_links as Link[]);
        setMissingProfileFields((result.missing_profile_fields ?? []) as string[]);
        setCompletingKey(null);
        return;
      }

      if (result?.success) {
        if (result.penalty_applied) {
          toast.error(`Completed with penalty: ${result.pointsAwarded} pts. Next time, finish the links first!`);
        } else if (result.pointsAwarded > 0) {
          toast.success(`+${result.pointsAwarded} points earned! 🏕️`);
        }
        onComplete();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Failed: " + message);
    } finally {
      setCompletingKey(null);
    }
  }, [userId, completeItem, onComplete]);

  const handleForceComplete = useCallback(() => {
    if (warningItem) {
      setWarningItem(null);
      setMissingLinks([]);
      handleComplete(warningItem, true);
    }
  }, [warningItem, handleComplete]);

  const handleWarningClose = useCallback(() => {
    setWarningItem(null);
    setMissingLinks([]);
    setMissingProfileFields([]);
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
        </div>
      </Card>
    );
  }

  const completedCount = items.filter((i) => i.item_key && completedKeys.includes(i.item_key)).length;
  const totalCount = items.length;
  const allDone = completedCount === totalCount;

  return (
    <>
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
                style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Deadline countdown */}
        {deadline && !allDone && (
          <div className="mb-4">
            <DeadlineCountdown deadline={deadline} />
          </div>
        )}

        {allDone && (
          <div className="mb-4 p-3 rounded-lg bg-camp-green/10 border border-camp-green/20 flex items-center gap-2">
            <Icon icon="check-circle" className="w-5 h-5 text-camp-green" />
            <span className="text-sm font-medium text-camp-green">
              All pre-work complete! You're summit-ready.
            </span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {items.map((item) => {
            const isCompleted = item.item_key ? completedKeys.includes(item.item_key) : false;
            const isCompletingThis = completingKey === item.item_key;
            const itemLinks = item.links;

            return (
              <div key={item.id}>
              <div
                className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
                  isCompleted
                    ? "bg-camp-green/5 border-camp-green/20"
                    : "bg-background border-border hover:border-camp-amber/30"
                }`}
              >
                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  isCompleted ? "bg-camp-green text-white" : "bg-muted text-muted-foreground"
                }`}>
                  {isCompleted ? (
                    <Icon icon="check" className="w-4 h-4" />
                  ) : (
                    <Icon icon={item.icon as IconName} className="w-4 h-4" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${isCompleted ? "text-camp-green" : "text-foreground"}`}>
                      {item.title}
                    </h3>
                    {isCompleted && <span className="text-xs text-camp-green font-medium">+5 pts</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.content}</p>
                  {item.tip && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">{item.tip}</p>
                  )}

                  {/* Links */}
                  {itemLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {itemLinks.map((link, idx) => {
                        const isClicked = clickedLinks.has(`${item.id}:${link.url}`);
                        return (
                          <button
                            key={idx}
                            onClick={() => handleLinkClick(item.id, link.url)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                              isClicked
                                ? "bg-camp-green/10 border-camp-green/30 text-camp-green"
                                : "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                            }`}
                          >
                            <Icon icon={isClicked ? "check-circle" : "external-link"} className="w-3 h-3" />
                            {link.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0">
                  {isCompleted ? (
                    <div className="text-xs text-camp-green font-medium flex items-center gap-1">
                      <Icon icon="check-circle" className="w-4 h-4" />
                      Done
                    </div>
                  ) : (item.item_key === "wheel_and_deal" || item.item_key === "challenger_sales") ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`text-xs ${submittedForms.has(item.item_key)
                        ? "border-camp-green/30 text-camp-green hover:bg-camp-green hover:text-white"
                        : "border-muted text-muted-foreground cursor-not-allowed opacity-50"
                      }`}
                      onClick={() => handleComplete(item, false)}
                      disabled={!submittedForms.has(item.item_key) || (completing && isCompletingThis)}
                    >
                      {isCompletingThis ? (
                        <Icon icon="loader" className="w-3 h-3 animate-spin mr-1" />
                      ) : !submittedForms.has(item.item_key) ? (
                        <Icon icon="lock" className="w-3 h-3 mr-1" />
                      ) : null}
                      Mark Complete
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs border-camp-green/30 text-camp-green hover:bg-camp-green hover:text-white"
                      onClick={() => handleComplete(item, false)}
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

              {/* Custom validation forms — render below the item card */}
              {!isCompleted && item.item_key === "wheel_and_deal" && (
                <WheelAndDealForm camperId={userId} onComplete={() => {
                  setSubmittedForms(prev => new Set(prev).add("wheel_and_deal"));
                }} />
              )}
              {!isCompleted && item.item_key === "challenger_sales" && (
                <ChallengerUpload
                  camperId={userId}
                  camperRole={camperRole ?? ""}
                  links={itemLinks}
                  onComplete={() => {
                    setSubmittedForms(prev => new Set(prev).add("challenger_sales"));
                    onComplete(); // For auto-complete (exempt roles), also refresh
                  }}
                />
              )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Warning Modal */}
      {warningItem && (
        <PreWorkWarningModal
          itemTitle={warningItem.title}
          missingLinks={missingLinks}
          missingProfileFields={missingProfileFields}
          onOpenLink={(url) => handleLinkClick(warningItem.id, url)}
          onForceComplete={handleForceComplete}
          onClose={handleWarningClose}
        />
      )}
    </>
  );
}
