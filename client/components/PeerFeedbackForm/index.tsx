import { useState, useCallback, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePointsBubble } from "@/components/PointsBubble/index.js";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import FeedbackLines from "./FeedbackLines.js";
import FeedbackTargetPicker from "./FeedbackTargetPicker.js";

type Props = {
  camperTeamId: number;
  /** The team the live round picked, and the presentation running. Pre-fills the form. */
  presenting: { teamId: number; presentationTitle: string } | null;
};

const TEAM_TYPES = ["team_presentation", "team_workshop", "hackathon"];
const GLOW_HINTS = ["Their opening hook was incredible...", "Data storytelling was clear and compelling...", "Great energy and confidence on stage..."];
const GROW_HINTS = ["Could tighten the value prop section...", "More eye contact with the audience...", "Add a stronger closing CTA..."];

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

/**
 * cAMPfire Review: 3 Glows, 3 Grows, and optional Trail Notes for another team's presentation.
 * One review per cAMPer per team per presentation, never for your own team.
 */
export default function PeerFeedbackForm({ camperTeamId, presenting }: Props) {
  const showPoints = usePointsBubble();
  const [isOpen, setIsOpen] = useState(false);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [presentation, setPresentation] = useState("");
  const [manual, setManual] = useState(false);
  const [glow, setGlow] = useState(["", "", ""]);
  const [grow, setGrow] = useState(["", "", ""]);
  const [trailNotes, setTrailNotes] = useState("");

  const { run: submitFeedback, loading: submitting } = useApi("SubmitPeerFeedback");
  const { data: teamsData } = useApiData("GetTeams", {}, { staleTime: 30_000 });
  const { data: presentationsData } = useApiData("GetPresentations", { status: null }, { staleTime: 30_000 });
  const { data: feedbackData, refetch: refetchFeedback } = useApiData("GetPeerFeedback", { session_label: null, team_id: null });

  // You can never review your own team (or the TEST team).
  const teams = useMemo(
    () => (teamsData?.teams ?? []).filter((t) => t.id !== camperTeamId && t.name.trim().toUpperCase() !== "TEST"),
    [teamsData, camperTeamId]
  );
  const presentations = useMemo(
    () => (presentationsData?.presentations ?? [])
      .filter((p) => TEAM_TYPES.includes(p.presentation_type ?? ""))
      .map((p) => p.title),
    [presentationsData]
  );

  const myTeamIsUp = !!presenting && presenting.teamId === camperTeamId;
  const canAutoFill = !!presenting && !myTeamIsUp && teams.some((t) => t.id === presenting.teamId);
  const autoFilled = canAutoFill && !manual;

  // Follow the live round: whenever a new team is picked, the form points at them.
  useEffect(() => {
    if (!canAutoFill || manual || !presenting) return;
    setTeamId(presenting.teamId);
    setPresentation(presenting.presentationTitle);
  }, [canAutoFill, manual, presenting]);

  const alreadySubmitted = useMemo(() => {
    if (!teamId || !presentation) return false;
    return (feedbackData?.my_reviews ?? []).some((r) => r.team_id === teamId && r.session_label === presentation);
  }, [teamId, presentation, feedbackData]);

  const glowValid = glow.every((s) => s.trim().length > 0);
  const growValid = grow.every((s) => s.trim().length > 0);
  const canSubmit = !!teamId && teamId !== camperTeamId && !!presentation && glowValid && growValid && !alreadySubmitted && !submitting;

  const missing = !teamId || !presentation
    ? "Pick a team and presentation"
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
        toast.info("You've already reviewed this team for this presentation.");
        await refetchFeedback();
        return;
      }
      if (res?.error === "own_team") {
        toast.error("You can't review your own team.");
        return;
      }
      toast.success("🏕️ cAMPfire Feedback submitted!");
      if (res?.points_awarded) showPoints(res.points_awarded);
      setGlow(["", "", ""]);
      setGrow(["", "", ""]);
      setTrailNotes("");
      setManual(false);
      setIsOpen(false);
      await refetchFeedback();
    } catch (err) {
      toast.error("Failed to submit: " + errorText(err));
    }
  }, [canSubmit, teamId, glow, grow, trailNotes, presentation, submitFeedback, refetchFeedback, showPoints]);

  const update = (setter: typeof setGlow) => (index: number, value: string) =>
    setter((prev) => prev.map((v, i) => (i === index ? value : v)));

  if (!isOpen) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md hover:from-amber-600 hover:to-orange-600"
        >
          <Icon icon="message-circle" className="mr-2 h-4 w-4" />
          🏕️ Give cAMPfire Feedback
        </Button>
        {myTeamIsUp && <span className="text-xs text-muted-foreground">Your team is presenting. You can review the other teams.</span>}
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

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
        <span className="mt-px text-base">💙</span>
        <div>
          <span className="font-semibold">Remember:</span> Feedback is a gift, not an attack. Be kind, thoughtful, and intentional.
          The best feedback is specific and actionable.
        </div>
      </div>

      <FeedbackTargetPicker
        teams={teams}
        presentations={presentations}
        teamId={teamId}
        presentation={presentation}
        autoFilled={autoFilled}
        onTeamChange={setTeamId}
        onPresentationChange={setPresentation}
        onUnlock={() => setManual(true)}
      />

      {alreadySubmitted && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-100 p-3 text-xs text-amber-800">
          <Icon icon="circle-check" className="h-4 w-4" />
          You've already reviewed this team for this presentation.
        </div>
      )}

      <FeedbackLines icon="☀️" title="Glow" hint="3 things that shined" values={glow} placeholders={GLOW_HINTS} tone="amber" onChange={update(setGlow)} />
      <FeedbackLines icon="🌱" title="Grow" hint="3 growth opportunities" values={grow} placeholders={GROW_HINTS} tone="green" onChange={update(setGrow)} />

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
