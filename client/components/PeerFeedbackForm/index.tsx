import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePointsBubble } from "@/components/PointsBubble/index.js";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { useSessionState } from "@/lib/useSessionState.js";
import FeedbackLines from "./FeedbackLines.js";
import FeedbackTargetPicker from "./FeedbackTargetPicker.js";
import FeedbackStatusNote from "./FeedbackStatusNote.js";

export type FeedbackRound = {
  status: "none" | "open" | "closing" | "closed";
  presentationTitle: string | null;
  closesAt: string | null;
  /** Teams that have presented in the live round, in order. */
  presented: { id: number; name: string }[];
  /** The team presenting right now. */
  upNowId: number | null;
};

type Props = {
  camperTeamId: number;
  round: FeedbackRound;
  /** Refresh the round (e.g. after a submit is rejected because feedback just closed). */
  onRoundStale: () => void;
};

const GLOW_HINTS = ["Their opening hook was incredible...", "Data storytelling was clear and compelling...", "Great energy and confidence on stage..."];
const GROW_HINTS = ["Could tighten the value prop section...", "More eye contact with the audience...", "Add a stronger closing CTA..."];

type Draft = { teamId: number | null; glow: string[]; grow: string[]; trailNotes: string };
const EMPTY_DRAFT: Draft = { teamId: null, glow: ["", "", ""], grow: ["", "", ""], trailNotes: "" };

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

/**
 * cAMPfire Review: 3 Glows, 3 Grows, and optional Trail Notes for another team's presentation.
 * Only for the live presentation, only for teams that have presented, never your own team,
 * and only until feedback closes (10 minutes after every team is scored).
 */
export default function PeerFeedbackForm({ camperTeamId, round, onRoundStale }: Props) {
  const showPoints = usePointsBubble();
  const presentation = round.presentationTitle ?? "";
  const accepting = round.status === "open" || round.status === "closing";

  // The review in progress is kept for this browser tab, so a refresh or a quick trip to another
  // page never wipes what someone has typed.
  const [draft, setDraft] = useSessionState<Draft>(`camp-feedback-draft:${presentation}`, EMPTY_DRAFT);
  const { teamId, glow, grow, trailNotes } = draft;
  const hasDraft = [...glow, ...grow, trailNotes].some((s) => s.trim().length > 0);
  const [isOpen, setIsOpen] = useState(hasDraft);
  const [manual, setManual] = useState(false);
  const setTeamId = useCallback((id: number | null) => setDraft((d) => ({ ...d, teamId: id })), [setDraft]);
  const setTrailNotes = (value: string) => setDraft((d) => ({ ...d, trailNotes: value }));

  const { run: submitFeedback, loading: submitting } = useApi("SubmitPeerFeedback");
  const { data: feedbackData, refetch: refetchFeedback } = useApiData("GetPeerFeedback", { session_label: null, team_id: null });

  const reviewedIds = useMemo(
    () => new Set((feedbackData?.my_reviews ?? []).filter((r) => r.session_label === presentation).map((r) => r.team_id)),
    [feedbackData, presentation]
  );

  // Teams you can review this round: they've presented, and they aren't your team or TEST.
  const teams = useMemo(
    () => round.presented
      .filter((t) => t.id !== camperTeamId && t.name.trim().toUpperCase() !== "TEST")
      .map((t) => ({ ...t, reviewed: reviewedIds.has(t.id) })),
    [round.presented, camperTeamId, reviewedIds]
  );
  const reviewedCount = teams.filter((t) => t.reviewed).length;

  const myTeamIsUp = round.upNowId !== null && round.upNowId === camperTeamId;
  const canAutoFill = round.upNowId !== null && teams.some((t) => t.id === round.upNowId);
  const autoFilled = canAutoFill && !manual;

  // Follow the live round: whenever a new team is picked, the form points at them. Once someone
  // has started writing, the team stays put, so a review never jumps to the next team mid-sentence.
  useEffect(() => {
    if (canAutoFill && !manual && (!hasDraft || teamId === null)) setTeamId(round.upNowId);
  }, [canAutoFill, manual, hasDraft, teamId, round.upNowId, setTeamId]);
  const nextTeamWaiting = hasDraft && teamId !== null && canAutoFill && round.upNowId !== teamId
    ? teams.find((t) => t.id === round.upNowId) ?? null
    : null;

  // If the chosen team is no longer reviewable (round changed), clear it.
  useEffect(() => {
    if (teamId !== null && !teams.some((t) => t.id === teamId)) setTeamId(null);
  }, [teamId, teams, setTeamId]);

  const alreadySubmitted = teamId !== null && reviewedIds.has(teamId);
  const glowValid = glow.every((s) => s.trim().length > 0);
  const growValid = grow.every((s) => s.trim().length > 0);
  const canSubmit = accepting && !!teamId && teamId !== camperTeamId && glowValid && growValid && !alreadySubmitted && !submitting;

  const missing = !teamId
    ? "Pick a team"
    : !glowValid || !growValid
      ? `Fill in all 3 Glows and 3 Grows (${glow.filter((s) => s.trim()).length + grow.filter((s) => s.trim()).length}/6)`
      : null;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !teamId) return;
    const items = [
      ...glow.map((content) => ({ category: "sunshine" as const, content: content.trim() })),
      ...grow.map((content) => ({ category: "rain" as const, content: content.trim() })),
      ...(trailNotes.trim() ? [{ category: "trail_notes" as const, content: trailNotes.trim() }] : []),
    ];
    try {
      const res = await submitFeedback({ session_label: presentation, team_id: teamId, items });
      if (res?.error === "already_submitted") {
        // Usually a retry after a slow connection: the first send already went through.
        toast.info("You've already reviewed this team for this presentation.");
        setDraft(EMPTY_DRAFT);
        setManual(false);
        await refetchFeedback();
        return;
      }
      if (res?.error === "own_team") {
        toast.error("You can't review your own team.");
        return;
      }
      if (res?.error === "closed") {
        toast.error("Feedback for this presentation just closed.");
        onRoundStale();
        return;
      }
      if (res?.error === "not_presented") {
        toast.error("That team hasn't presented yet.");
        onRoundStale();
        return;
      }
      toast.success("🏕️ cAMPfire Feedback submitted!");
      if (res?.points_awarded) showPoints(res.points_awarded);
      setDraft(EMPTY_DRAFT);
      setManual(false);
      setIsOpen(false);
      await refetchFeedback();
    } catch (err) {
      toast.error("Failed to submit: " + errorText(err));
    }
  }, [canSubmit, teamId, glow, grow, trailNotes, presentation, submitFeedback, refetchFeedback, showPoints, onRoundStale, setDraft]);

  const update = (field: "glow" | "grow") => (index: number, value: string) =>
    setDraft((d) => ({ ...d, [field]: d[field].map((v, i) => (i === index ? value : v)) }));

  const status = (
    <FeedbackStatusNote
      status={round.status}
      presentationTitle={round.presentationTitle}
      closesAt={round.closesAt}
      reviewedCount={reviewedCount}
      reviewableCount={teams.length}
    />
  );

  if (!isOpen || !accepting) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setIsOpen(true)}
            disabled={!accepting || teams.length === 0}
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600"
          >
            <Icon icon="message-circle" className="mr-2 h-4 w-4" />
            🏕️ Give cAMPfire Feedback
          </Button>
          {accepting && teams.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {reviewedCount} of {teams.length} reviewed · 3 pts each
            </span>
          )}
          {myTeamIsUp && accepting && <span className="text-xs text-muted-foreground">Your team is presenting. You can review the other teams.</span>}
        </div>
        {status}
      </div>
    );
  }

  return (
    <Card className="space-y-5 border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold">🏕️ cAMPfire Feedback</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Share thoughtful feedback to help your peers level up</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          <Icon icon="x" className="h-4 w-4" />
        </Button>
      </div>

      {status}

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <span className="mt-px text-base">💙</span>
        <div>
          <span className="font-semibold">Remember:</span> Feedback is a gift, not an attack. Be kind, thoughtful, and intentional.
          The best feedback is specific and actionable.
        </div>
      </div>

      <FeedbackTargetPicker
        teams={teams}
        presentation={presentation}
        teamId={teamId}
        autoFilled={autoFilled}
        onTeamChange={setTeamId}
        onUnlock={() => setManual(true)}
      />

      {nextTeamWaiting && (
        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-800">
          <Icon icon="mic" className="h-4 w-4 shrink-0" />
          <span><b>{nextTeamWaiting.name}</b> is up now. Finish and submit this review first, then you can review them.</span>
        </div>
      )}

      {alreadySubmitted && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 p-3 text-xs text-amber-800">
          <Icon icon="circle-check" className="h-4 w-4" />
          You've already reviewed this team for this presentation.
        </div>
      )}

      <FeedbackLines icon="☀️" title="Glow" hint="3 things that shined" values={glow} placeholders={GLOW_HINTS} tone="amber" onChange={update("glow")} />
      <FeedbackLines icon="🌱" title="Grow" hint="3 growth opportunities" values={grow} placeholders={GROW_HINTS} tone="green" onChange={update("grow")} />

      <div>
        <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
          <span className="text-lg">📝</span> Trail Notes
          <span className="text-xs font-normal text-muted-foreground">— anything else (optional)</span>
        </h4>
        <textarea
          value={trailNotes}
          maxLength={1000}
          onChange={(e) => setTrailNotes(e.target.value)}
          placeholder="Additional thoughts, shout-outs, or suggestions..."
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camp-green/30"
        />
      </div>

      <div className="space-y-1.5">
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 font-semibold text-white hover:from-amber-600 hover:to-orange-600"
          size="lg"
        >
          {submitting ? "Sending..." : "🏕️ Submit cAMPfire Feedback"}
        </Button>
        {missing && !alreadySubmitted && <p className="text-center text-xs text-muted-foreground">{missing}</p>}
      </div>
    </Card>
  );
}
