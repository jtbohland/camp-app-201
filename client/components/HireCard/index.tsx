import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
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
  team_id: number | null;
  team_name: string | null;
  team_color: string | null;
  team_logo_url: string | null;
  flight_departure_date: string | null;
  flight_departure_time: string | null;
  leave_office_by: string | null;
};

type PreworkItem = { item_key: string; title: string; completed: boolean };
type AbsenceRequest = { id: number; reason: string; start_time: string | null; end_time: string | null; status: string; created_at: string };
type Comment = { id: number; comment_type: string; sentiment: string; content: string; created_at: string; manager_first_name: string; manager_last_name: string };
type SurveyCompletion = { survey_id: number; survey_title: string; submitted_at: string };
type ExecQuestion = { id: number; question_text: string; executive_name: string; vote_count: number; is_asked: boolean; created_at: string };
type PresentationScore = { presentation_title: string; day_number: number; total_score: number; max_possible: number };

type HireDetail = {
  camper: Camper;
  prework: PreworkItem[];
  absences: AbsenceRequest[];
  comments: Comment[];
  surveys: SurveyCompletion[];
  exec_questions: ExecQuestion[];
  presentation_scores: PresentationScore[];
  rank: number | null;
};

type HireCardProps = {
  hire: HireDetail;
  totalCampers: number;
  totalSurveys: number;
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

function SectionHeader({ icon, title, count }: { icon: IconName; title: string; count?: number }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
      <Icon icon={icon} className="w-3.5 h-3.5" />
      {title}
      {count !== undefined && <span className="text-muted-foreground/60">({count})</span>}
    </h4>
  );
}

function HireCard({ hire, totalCampers, totalSurveys, managerEmail, onCommentAdded }: HireCardProps) {
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [sentiment, setSentiment] = useState("positive");
  const [expanded, setExpanded] = useState(false);

  const { run: addComment, loading: addingComment } = useApi("AddManagerComment");

  const completedPrework = hire.prework.filter(p => p.completed).length;
  const totalPrework = hire.prework.length;
  const preworkPct = totalPrework > 0 ? Math.round((completedPrework / totalPrework) * 100) : 0;
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
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed: " + message);
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
    } catch { toast.error("Failed to react"); }
  }, [managerEmail, hire.camper.id, addComment, onCommentAdded]);

  return (
    <Card className={`p-5 ${isBottomQuartile ? "border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
      {/* Header with team badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
            {hire.camper.first_name[0]}{hire.camper.last_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold">{hire.camper.first_name} {hire.camper.last_name}</h3>
              {isBottomQuartile && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-[10px]">
                  <Icon icon="alert-triangle" className="w-3 h-3 mr-0.5" />
                  Bottom 25%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{hire.camper.role}</p>
            {/* Team badge */}
            {hire.camper.team_name && (
              <div className="flex items-center gap-1.5 mt-1">
                {hire.camper.team_color ? (
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hire.camper.team_color }} />
                ) : (
                  <Icon icon="flag" className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="text-xs font-medium text-muted-foreground">{hire.camper.team_name}</span>
              </div>
            )}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
          <Icon icon={expanded ? "chevron-up" : "chevron-down"} className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <StatBox icon="flame" iconColor="text-camp-amber" value={hire.camper.points} label="XP" />
        <StatBox icon="hash" iconColor="text-primary" value={hire.rank ?? "—"} label={`Rank / ${totalCampers}`} />
        <StatBox icon="check-circle" iconColor="text-camp-green" value={`${preworkPct}%`} label="Pre-work" />
        <StatBox icon="clipboard-list" iconColor="text-purple-500" value={`${hire.surveys.length}/${totalSurveys}`} label="Surveys" />
        <StatBox icon="user-check" iconColor="text-blue-500" value={hire.camper.profile_completed ? "✓" : "✗"} label="Profile" />
      </div>

      {/* Quick reactions */}
      <div className="flex items-center gap-1 mb-3">
        <span className="text-xs text-muted-foreground mr-1">React:</span>
        {REACTIONS.map(r => (
          <button key={r.emoji} onClick={() => handleReaction(r.emoji, r.label)} title={r.label}
            className="text-lg hover:scale-125 transition-transform">{r.emoji}</button>
        ))}
        <Button variant="ghost" size="sm" className="ml-auto text-xs h-7"
          onClick={() => setShowCommentForm(!showCommentForm)}>
          <Icon icon="message-circle" className="w-3.5 h-3.5 mr-1" />Comment
        </Button>
      </div>

      {/* Comment form */}
      {showCommentForm && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/30 border mb-3">
          <Select value={sentiment} onValueChange={setSentiment}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SENTIMENTS.map(s => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-1.5">
                    <Icon icon={s.icon} className={`w-3.5 h-3.5 ${s.color}`} />{s.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Add a note about this cAMPer's progress..." value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)} rows={2} className="text-sm" />
          <p className="text-[10px] text-muted-foreground">
            <Icon icon="eye" className="w-3 h-3 inline mr-0.5" />Visible to you and cAMP counselors/admins
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
        <div className="flex flex-col gap-5 mt-3 pt-3 border-t">
          {/* Pre-work breakdown */}
          <div>
            <SectionHeader icon="check-circle" title="Pre-work Progress" count={completedPrework} />
            <div className="flex flex-col gap-1">
              {hire.prework.map(item => (
                <div key={item.item_key} className="flex items-center gap-2 text-sm">
                  <Icon icon={item.completed ? "check-circle" : "circle"}
                    className={`w-4 h-4 ${item.completed ? "text-camp-green" : "text-muted-foreground/40"}`} />
                  <span className={item.completed ? "" : "text-muted-foreground"}>{item.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flight departure */}
          {(hire.camper.flight_departure_date || hire.camper.flight_departure_time) && (
            <div>
              <SectionHeader icon="plane" title="Flight Departure" />
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

          {/* Absence requests */}
          {hire.absences.length > 0 && (
            <div>
              <SectionHeader icon="calendar-off" title="Absence Requests" count={hire.absences.length} />
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

          {/* Survey completions */}
          <div>
            <SectionHeader icon="clipboard-list" title="Survey Completions" count={hire.surveys.length} />
            {hire.surveys.length === 0 ? (
              <p className="text-sm text-muted-foreground">No surveys completed yet</p>
            ) : (
              <div className="flex flex-col gap-1">
                {hire.surveys.map(s => (
                  <div key={s.survey_id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
                    <span className="flex items-center gap-1.5">
                      <Icon icon="check" className="w-3.5 h-3.5 text-camp-green" />
                      {s.survey_title}
                    </span>
                    <span className="text-xs text-muted-foreground">{new Date(s.submitted_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wheel & Deal */}
          <div>
            <SectionHeader icon="refresh-cw" title="Wheel & Deal" />
            <WheelDealSection camperId={hire.camper.id} />
          </div>

          {/* Executive Q&A submissions */}
          <div>
            <SectionHeader icon="hand-helping" title="Executive Q&A Submissions" count={hire.exec_questions.length} />
            {hire.exec_questions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No questions submitted yet</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {hire.exec_questions.map(q => (
                  <div key={q.id} className="text-sm p-2 rounded bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <p className="flex-1">&ldquo;{q.question_text}&rdquo;</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px]">{q.vote_count} vote{q.vote_count !== 1 ? "s" : ""}</Badge>
                        {q.is_asked && <Badge className="text-[10px] bg-camp-green">Asked</Badge>}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      For {q.executive_name} · {new Date(q.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Team presentation scores */}
          <div>
            <SectionHeader icon="presentation" title="Team Presentation Scores" count={hire.presentation_scores.length} />
            {hire.presentation_scores.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {hire.camper.team_name ? "No presentations scored yet" : "Not assigned to a team"}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {hire.presentation_scores.map((ps, i) => {
                  const pct = ps.max_possible > 0 ? Math.round((ps.total_score / ps.max_possible) * 100) : 0;
                  return (
                    <div key={i} className="text-sm p-2 rounded bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{ps.presentation_title}</span>
                        <span className="text-xs text-muted-foreground">Day {ps.day_number}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-camp-green rounded-full transition-all"
                            style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{ps.total_score}/{ps.max_possible} ({pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manager notes history */}
          {hire.comments.length > 0 && (
            <div>
              <SectionHeader icon="message-circle" title="Manager Notes" count={hire.comments.length} />
              <div className="flex flex-col gap-2">
                {hire.comments.slice(0, 10).map(c => {
                  const sentimentInfo = SENTIMENTS.find(s => s.value === c.sentiment);
                  return (
                    <div key={c.id} className="flex items-start gap-2 text-sm p-2 rounded bg-muted/30">
                      {sentimentInfo && <Icon icon={sentimentInfo.icon} className={`w-4 h-4 mt-0.5 ${sentimentInfo.color}`} />}
                      <div className="flex-1">
                        <p>{c.content}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {c.manager_first_name} {c.manager_last_name} · {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      {c.comment_type === "reaction" && <Badge variant="outline" className="text-[10px]">Reaction</Badge>}
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

function StatBox({ icon, iconColor, value, label }: { icon: IconName; iconColor: string; value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center p-2 rounded-lg bg-muted/50">
      <Icon icon={icon} className={`w-4 h-4 ${iconColor} mb-1`} />
      <span className="text-lg font-bold">{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

function WheelDealSection({ camperId }: { camperId: number }) {
  const { data } = useApiData("GetWheelLeaderboard", {}, { staleTime: 30_000 });
  const leaders = data?.leaders ?? [];
  const stats = leaders.find((l: { camper_id: number }) => l.camper_id === camperId);

  if (!stats) return <p className="text-sm text-muted-foreground">No pitches yet</p>;

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="p-2 rounded-lg bg-blue-50">
        <div className="text-lg font-bold text-blue-700">{stats.pitch_count}</div>
        <div className="text-[10px] text-muted-foreground">Pitches</div>
      </div>
      <div className="p-2 rounded-lg bg-blue-50">
        <div className="text-lg font-bold text-blue-700">{stats.avg_self_score || "—"}</div>
        <div className="text-[10px] text-muted-foreground">Self Avg</div>
      </div>
      <div className="p-2 rounded-lg bg-purple-50">
        <div className="text-lg font-bold text-purple-700">{stats.avg_room_score || "—"}</div>
        <div className="text-[10px] text-muted-foreground">Room Avg</div>
      </div>
      <div className="p-2 rounded-lg bg-amber-50">
        <div className="text-lg font-bold text-amber-700">{stats.total_points}</div>
        <div className="text-[10px] text-muted-foreground">W&D Pts</div>
      </div>
    </div>
  );
}

export default HireCard;
