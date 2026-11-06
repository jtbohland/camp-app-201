import { useState } from "react";
import { useNavigate } from "react-router";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";
import type { IconName } from "lucide-react/dynamic";
import { APPROVAL_LABELS, formatDuration } from "@/lib/absences.js";
import HireConversations from "@/components/HireConversations/index.js";
import type { ManagerThread } from "@/lib/managerThreads";

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
type AbsenceRequest = { id: number; reason: string; start_time: string | null; end_time: string | null; status: string; created_at: string; approval_type: string; minutes: number };
type SurveyCompletion = { survey_id: number; survey_title: string; submitted_at: string };
type ExecQuestion = { id: number; question_text: string; executive_name: string; vote_count: number; is_asked: boolean; created_at: string };
type PresentationScore = { presentation_title: string; day_number: number; total_score: number; max_possible: number };

type HireDetail = {
  camper: Camper;
  prework: PreworkItem[];
  absences: AbsenceRequest[];
  threads: ManagerThread[];
  unread_count: number;
  surveys: SurveyCompletion[];
  exec_questions: ExecQuestion[];
  presentation_scores: PresentationScore[];
  rank: number | null;
};

type HireCardProps = {
  hire: HireDetail;
  totalCampers: number;
  totalSurveys: number;
  /** False after camp closes: conversations stay readable, but no new notes. */
  canWrite: boolean;
};

function SectionHeader({ icon, title, count }: { icon: IconName; title: string; count?: number }) {
  return (
    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
      <Icon icon={icon} className="w-3.5 h-3.5" />
      {title}
      {count !== undefined && <span className="text-muted-foreground/60">({count})</span>}
    </h4>
  );
}

function HireCard({ hire, totalCampers, totalSurveys, canWrite }: HireCardProps) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  // Wheel & Deal data — shared between name pill and W&D section
  const { data: wdData } = useApiData("GetWheelLeaderboard", {}, { staleTime: 30_000 });
  const wdLeaders = wdData?.leaders ?? [];
  const topDealerId = (wdLeaders as any[])[0]?.camper_id ?? null;
  const isTopDealer = hire.camper.id === topDealerId;

  // Camp Spirit data
  const { data: spiritData } = useApiData("GetSpiritVoteResults", { camper_id: hire.camper.id }, { staleTime: 30_000 });
  const isSpiritWinner = (() => {
    if (!spiritData?.voting_complete) return false;
    const winners = spiritData?.winners ?? [];
    if (winners.length === 0) return false;
    const topVotes = (winners as any[])[0].vote_count;
    const tied = (winners as any[]).filter((w) => w.vote_count === topVotes);
    if (tied.length === 1) return tied[0].camper_id === hire.camper.id;
    const maxNotes = Math.max(...tied.map((w: any) => w.note_count));
    const noteWinners = tied.filter((w: any) => w.note_count === maxNotes);
    return noteWinners.some((w: any) => w.camper_id === hire.camper.id);
  })();
  const spiritVotesReceived = spiritData?.my_votes_received?.vote_count ?? 0;

  const completedPrework = hire.prework.filter(p => p.completed).length;
  const totalPrework = hire.prework.length;
  const preworkPct = totalPrework > 0 ? Math.round((completedPrework / totalPrework) * 100) : 0;
  const isBottomQuartile = hire.rank !== null && totalCampers > 0 && hire.rank > totalCampers * 0.75;

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
              {isTopDealer && (
                <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[9px] font-bold px-1.5 py-0">
                  🎡 Top Dealer
                </Badge>
              )}
              {isSpiritWinner && (
                <Badge className="bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-[9px] font-bold px-1.5 py-0">
                  ✨ Camp Spirit
                </Badge>
              )}
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
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => navigate(`/manager/hire/${hire.camper.id}`)}>
            <Icon icon="file-chart-column" className="w-4 h-4" />
            Full report card
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} aria-label={expanded ? "Hide details" : "Show details"}>
            <Icon icon={expanded ? "chevron-up" : "chevron-down"} className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <StatBox icon="flame" iconColor="text-camp-amber" value={hire.camper.points} label="XP" />
        <StatBox icon="hash" iconColor="text-primary" value={hire.rank ?? "—"} label={`Rank / ${totalCampers}`} />
        <StatBox icon="check-circle" iconColor="text-camp-green" value={`${preworkPct}%`} label="Pre-work" />
        <StatBox icon="clipboard-list" iconColor="text-purple-500" value={`${hire.surveys.length}/${totalSurveys}`} label="Surveys" />
        <StatBox icon="user-check" iconColor="text-blue-500" value={hire.camper.profile_completed ? "✓" : "✗"} label="Profile" />
      </div>

      {/* Conversations: reactions, notes (cAMPer or counselors only), replies */}
      <HireConversations
        camperId={hire.camper.id}
        camperFirstName={hire.camper.first_name}
        threads={hire.threads}
        unreadCount={hire.unread_count}
        canWrite={canWrite}
      />

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

          {/* Excused absences */}
          <div>
            <SectionHeader
              icon="calendar-off"
              title={`Excused Absences · ${hire.absences.filter((a) => a.status === "approved" && a.approval_type === "standard").length}/3 used`}
              count={hire.absences.length}
            />
            {hire.absences.length === 0 ? (
              <p className="text-sm text-muted-foreground">No absences. On track for perfect attendance (+3)</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {hire.absences.map((a) => {
                  const tag = APPROVAL_LABELS[a.approval_type] ?? APPROVAL_LABELS.standard;
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-2 text-sm p-2 rounded bg-muted/30">
                      <span className="truncate">{a.reason || "No reason given"}</span>
                      <div className="flex shrink-0 items-center gap-2">
                        {a.start_time && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(a.start_time).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })} · {formatDuration(a.minutes)}
                          </span>
                        )}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>{tag.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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
