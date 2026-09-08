import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import type { IconName } from "lucide-react/dynamic";

type Camper = {
  id: number;
  first_name: string;
  last_name: string;
  role: string;
  email: string;
  points: number;
  photo_url: string | null;
  profile_completed: boolean;
  team_name: string | null;
  flight_departure_date: string | null;
  flight_departure_time: string | null;
  leave_office_by: string | null;
};

type PreworkItem = {
  item_key: string;
  title: string;
  completed: boolean;
};

type AbsenceRequest = {
  id: number;
  reason: string;
  start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string;
};

type Comment = {
  id: number;
  comment_type: string;
  sentiment: string;
  content: string;
  created_at: string;
  manager_first_name: string;
  manager_last_name: string;
};

type HireDetail = {
  camper: Camper;
  prework: PreworkItem[];
  absences: AbsenceRequest[];
  comments: Comment[];
  rank: number | null;
};

type HireCardProps = {
  hire: HireDetail;
  totalCampers: number;
  managerEmail: string;
  onCommentAdded: () => void;
};

const SENTIMENTS: { value: string; label: string; icon: IconName; color: string }[] = [
  { value: "positive", label: "Positive", icon: "thumbs-up", color: "text-green-500" },
  { value: "encouraging", label: "Encouraging", icon: "heart", color: "text-pink-500" },
  { value: "feedback", label: "Feedback", icon: "message-circle", color: "text-blue-500" },
  { value: "concerning", label: "Concerning", icon: "alert-triangle", color: "text-amber-500" },
];

const REACTIONS = [
  { emoji: "🔥", label: "On fire!" },
  { emoji: "👏", label: "Great job" },
  { emoji: "💪", label: "Keep it up" },
  { emoji: "🎯", label: "On target" },
  { emoji: "⭐", label: "Star performer" },
  { emoji: "👀", label: "Watching" },
];

function HireCard({ hire, totalCampers, managerEmail, onCommentAdded }: HireCardProps) {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [sentiment, setSentiment] = useState("positive");
  const [expanded, setExpanded] = useState(false);

  const { run: addComment, loading: addingComment } = useApi("AddManagerComment");

  const completedPrework = hire.prework.filter(p => p.completed).length;
  const totalPrework = hire.prework.length;
  const preworkPct = totalPrework > 0 ? Math.round((completedPrework / totalPrework) * 100) : 0;

  // Flag if bottom 25%
  const isBottomQuartile = hire.rank !== null && totalCampers > 0 && hire.rank > totalCampers * 0.75;

  const handleSubmitComment = useCallback(async () => {
    if (!commentContent.trim()) return;
    try {
      await addComment({
        manager_email: managerEmail,
        camper_id: hire.camper.id,
        comment_type: "comment",
        sentiment,
        content: commentContent.trim(),
      });
      toast.success("Comment added");
      setCommentContent("");
      setShowCommentForm(false);
      onCommentAdded();
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : String(error);
      toast.error("Failed to add comment: " + message);
    }
  }, [commentContent, sentiment, managerEmail, hire.camper.id, addComment, onCommentAdded]);

  const handleReaction = useCallback(async (emoji: string, label: string) => {
    try {
      await addComment({
        manager_email: managerEmail,
        camper_id: hire.camper.id,
        comment_type: "reaction",
        sentiment: "positive",
        content: `${emoji} ${label}`,
      });
      toast.success(`Reacted with ${emoji}`);
      onCommentAdded();
    } catch {
      toast.error("Failed to react");
    }
  }, [managerEmail, hire.camper.id, addComment, onCommentAdded]);

  return (
    <Card className={`p-5 ${isBottomQuartile ? "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {hire.camper.first_name[0]}{hire.camper.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{hire.camper.first_name} {hire.camper.last_name}</h3>
              {isBottomQuartile && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                  <Icon icon="alert-triangle" className="w-3 h-3 mr-0.5" />
                  Bottom 25%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{hire.camper.role}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          <Icon icon={expanded ? "chevron-up" : "chevron-down"} className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Icon icon="flame" className="w-4 h-4 text-camp-amber mb-1" />
          <span className="text-lg font-bold">{hire.camper.points}</span>
          <span className="text-[10px] text-muted-foreground">XP</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Icon icon="hash" className="w-4 h-4 text-primary mb-1" />
          <span className="text-lg font-bold">{hire.rank ?? "—"}</span>
          <span className="text-[10px] text-muted-foreground">Rank / {totalCampers}</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Icon icon="check-circle" className="w-4 h-4 text-camp-green mb-1" />
          <span className="text-lg font-bold">{preworkPct}%</span>
          <span className="text-[10px] text-muted-foreground">Pre-work</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
          <Icon icon="user-check" className="w-4 h-4 text-blue-500 mb-1" />
          <span className="text-lg font-bold">{hire.camper.profile_completed ? "✓" : "✗"}</span>
          <span className="text-[10px] text-muted-foreground">Profile</span>
        </div>
      </div>

      {/* Quick reactions */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs text-muted-foreground mr-1">React:</span>
        {REACTIONS.map(r => (
          <button
            key={r.emoji}
            onClick={() => handleReaction(r.emoji, r.label)}
            title={r.label}
            className="text-lg hover:scale-125 transition-transform"
          >
            {r.emoji}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-xs h-7"
          onClick={() => setShowCommentForm(!showCommentForm)}
        >
          <Icon icon="message-circle" className="w-3.5 h-3.5 mr-1" />
          Comment
        </Button>
      </div>

      {/* Comment form */}
      {showCommentForm && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border mb-3">
          <div className="flex gap-2">
            <Select value={sentiment} onValueChange={setSentiment}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENTIMENTS.map(s => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className="flex items-center gap-1.5">
                      <Icon icon={s.icon} className={`w-3.5 h-3.5 ${s.color}`} />
                      {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            placeholder="Add a note about this cAMPer's progress..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <p className="text-[10px] text-muted-foreground">
            <Icon icon="eye" className="w-3 h-3 inline mr-0.5" />
            Visible to you and cAMP counselors/admins
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowCommentForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSubmitComment} disabled={addingComment || !commentContent.trim()}>
              {addingComment ? "Saving..." : "Post Comment"}
            </Button>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="flex flex-col gap-4 mt-3 pt-3 border-t">
          {/* Pre-work breakdown */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Pre-work Progress</h4>
            <div className="flex flex-col gap-1">
              {hire.prework.map(item => (
                <div key={item.item_key} className="flex items-center gap-2 text-sm">
                  <Icon
                    icon={item.completed ? "check-circle" : "circle"}
                    className={`w-4 h-4 ${item.completed ? "text-camp-green" : "text-muted-foreground/40"}`}
                  />
                  <span className={item.completed ? "" : "text-muted-foreground"}>{item.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flight info */}
          {(hire.camper.flight_departure_date || hire.camper.flight_departure_time) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Flight Departure</h4>
              <div className="flex items-center gap-4 text-sm">
                {hire.camper.flight_departure_date && (
                  <span className="flex items-center gap-1.5">
                    <Icon icon="calendar" className="w-3.5 h-3.5 text-muted-foreground" />
                    {hire.camper.flight_departure_date}
                  </span>
                )}
                {hire.camper.flight_departure_time && (
                  <span className="flex items-center gap-1.5">
                    <Icon icon="clock" className="w-3.5 h-3.5 text-muted-foreground" />
                    {hire.camper.flight_departure_time}
                  </span>
                )}
                {hire.camper.leave_office_by && (
                  <span className="flex items-center gap-1.5">
                    <Icon icon="log-out" className="w-3.5 h-3.5 text-muted-foreground" />
                    Leave by {hire.camper.leave_office_by}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Absences */}
          {hire.absences.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Absence Requests ({hire.absences.length})
              </h4>
              <div className="flex flex-col gap-1.5">
                {hire.absences.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                    <span>{a.reason}</span>
                    <div className="flex items-center gap-2">
                      {a.start_time && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.start_time).toLocaleDateString()}
                          {a.end_time && ` – ${new Date(a.end_time).toLocaleDateString()}`}
                        </span>
                      )}
                      <Badge variant={a.status === "approved" ? "default" : a.status === "pending" ? "secondary" : "outline"} className="text-[10px]">
                        {a.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments history */}
          {hire.comments.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Manager Notes ({hire.comments.length})
              </h4>
              <div className="flex flex-col gap-2">
                {hire.comments.slice(0, 5).map(c => {
                  const sentimentInfo = SENTIMENTS.find(s => s.value === c.sentiment);
                  return (
                    <div key={c.id} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                      {sentimentInfo && (
                        <Icon icon={sentimentInfo.icon} className={`w-4 h-4 mt-0.5 ${sentimentInfo.color}`} />
                      )}
                      <div className="flex-1">
                        <p>{c.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {c.manager_first_name} {c.manager_last_name} · {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {c.comment_type === "reaction" && (
                        <Badge variant="outline" className="text-[10px]">Reaction</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default HireCard;
