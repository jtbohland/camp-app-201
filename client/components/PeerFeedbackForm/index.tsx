import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { toast } from "sonner";

type Props = {
  camperId: number;
  camperTeamId: number;
};

/**
 * Peer Feedback Form — "Campfire Review"
 *
 * Campers submit structured feedback for other teams' presentations:
 * ☀️ Sunshine = 3 things they loved
 * 🌧️ Rain = 3 areas for growth
 * 📝 Trail Notes = open comments
 *
 * One submission per team per presentation. +5 pts for submitting.
 */
export default function PeerFeedbackForm({ camperId, camperTeamId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [selectedPresentation, setSelectedPresentation] = useState("");
  const [sunshine, setSunshine] = useState(["", "", ""]);
  const [rain, setRain] = useState(["", "", ""]);
  const [trailNotes, setTrailNotes] = useState("");

  const { run: submitFeedback, loading: submitting } = useApi("SubmitPeerFeedback");

  // Get teams for dropdown (excluding your own team)
  const { data: teamsData } = useApiData("GetTeams", {});
  const teams = useMemo(() => {
    const allTeams = (teamsData?.teams ?? []) as Array<{ id: number; name: string }>;
    return allTeams.filter((t) => t.id !== camperTeamId);
  }, [teamsData, camperTeamId]);

  // Get presentations for dropdown
  const { data: presentationsData } = useApiData("GetPresentations", { status: null });
  const presentations = useMemo(() => {
    return ((presentationsData?.presentations ?? []) as Array<{ id: number; title: string }>)
      .map((p) => p.title);
  }, [presentationsData]);

  // Get existing feedback to check for duplicates
  const { data: existingFeedback, refetch: refetchFeedback } = useApiData("GetPeerFeedback", {
    session_label: null,
    team_id: null,
  });

  // Check if camper already submitted for this team+presentation combo
  const alreadySubmitted = useMemo(() => {
    if (!selectedTeamId || !selectedPresentation) return false;
    const feedbacks = (existingFeedback?.feedback ?? []) as Array<{
      team_name: string | null;
      session_label: string;
      author_name: string;
    }>;
    // Check if any feedback from this author exists for this session+team
    return feedbacks.some(
      (f) => f.session_label === selectedPresentation && f.team_name === teams.find(t => t.id === selectedTeamId)?.name
    );
  }, [selectedTeamId, selectedPresentation, existingFeedback, teams]);

  const sunshineValid = sunshine.filter((s) => s.trim().length > 0).length >= 3;
  const rainValid = rain.filter((r) => r.trim().length > 0).length >= 3;
  const canSubmit = selectedTeamId && selectedPresentation && sunshineValid && rainValid && !alreadySubmitted && !submitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      // Submit each sunshine item
      for (let i = 0; i < 3; i++) {
        await submitFeedback({
          session_label: selectedPresentation,
          team_id: selectedTeamId,
          author_id: camperId,
          category: "sunshine",
          content: sunshine[i].trim(),
          points_to_award: i === 0 ? 5 : 0, // Only award points once
        });
      }

      // Submit each rain item
      for (let i = 0; i < 3; i++) {
        await submitFeedback({
          session_label: selectedPresentation,
          team_id: selectedTeamId,
          author_id: camperId,
          category: "rain",
          content: rain[i].trim(),
          points_to_award: 0,
        });
      }

      // Submit trail notes if provided
      if (trailNotes.trim()) {
        await submitFeedback({
          session_label: selectedPresentation,
          team_id: selectedTeamId,
          author_id: camperId,
          category: "trail_notes",
          content: trailNotes.trim(),
          points_to_award: 0,
        });
      }

      toast.success("🏕️ Campfire Review submitted! +5 pts");

      // Reset form
      setSunshine(["", "", ""]);
      setRain(["", "", ""]);
      setTrailNotes("");
      setSelectedTeamId(null);
      setSelectedPresentation("");
      setIsOpen(false);
      refetchFeedback();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed to submit: " + msg);
    }
  }, [canSubmit, selectedPresentation, selectedTeamId, camperId, sunshine, rain, trailNotes, submitFeedback, refetchFeedback]);

  const updateSunshine = useCallback((index: number, value: string) => {
    setSunshine((prev) => { const n = [...prev]; n[index] = value; return n; });
  }, []);
  const updateRain = useCallback((index: number, value: string) => {
    setRain((prev) => { const n = [...prev]; n[index] = value; return n; });
  }, []);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md"
      >
        <Icon icon="message-circle" className="w-4 h-4 mr-2" />
        🏕️ Give Campfire Review
      </Button>
    );
  }

  return (
    <Card className="p-6 border-2 border-amber-200 bg-gradient-to-br from-amber-50/50 to-orange-50/30 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            🏕️ Campfire Review
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Share thoughtful feedback to help your peers level up
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-camp-green/15 text-camp-green border-camp-green/30 text-xs">+5 pts</Badge>
          <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
            <Icon icon="x" className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Kindness reminder */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
        <span className="text-base mt-px">💙</span>
        <div>
          <span className="font-semibold">Remember:</span> Feedback is a gift, not an attack. Be kind, thoughtful, and intentional.
          Help your fellow cAMPers grow — the best feedback is specific and actionable.
        </div>
      </div>

      {/* Team + Presentation Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Which team?</label>
          <select
            value={selectedTeamId ?? ""}
            onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select team...</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Which presentation?</label>
          <select
            value={selectedPresentation}
            onChange={(e) => setSelectedPresentation(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">Select presentation...</option>
            {presentations.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {alreadySubmitted && (
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 flex items-center gap-2">
          <Icon icon="check-circle" className="w-4 h-4" />
          You've already submitted a review for this team's presentation!
        </div>
      )}

      {/* Sunshine — 3 things they loved */}
      <div>
        <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
          <span className="text-lg">☀️</span> Sunshine
          <span className="text-xs font-normal text-muted-foreground">— 3 things that shined</span>
        </h4>
        <div className="space-y-2">
          {sunshine.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-amber-400 text-xs font-bold w-4">{i + 1}.</span>
              <input
                type="text"
                value={val}
                onChange={(e) => updateSunshine(i, e.target.value)}
                placeholder={i === 0 ? "Their opening hook was incredible..." : i === 1 ? "Data storytelling was clear and compelling..." : "Great energy and confidence on stage..."}
                className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Rain — 3 areas for growth */}
      <div>
        <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
          <span className="text-lg">🌧️</span> Rain
          <span className="text-xs font-normal text-muted-foreground">— 3 growth opportunities</span>
        </h4>
        <div className="space-y-2">
          {rain.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-blue-400 text-xs font-bold w-4">{i + 1}.</span>
              <input
                type="text"
                value={val}
                onChange={(e) => updateRain(i, e.target.value)}
                placeholder={i === 0 ? "Could tighten the value prop section..." : i === 1 ? "More eye contact with the audience..." : "Add a stronger closing CTA..."}
                className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Trail Notes */}
      <div>
        <h4 className="text-sm font-bold flex items-center gap-2 mb-2">
          <span className="text-lg">📝</span> Trail Notes
          <span className="text-xs font-normal text-muted-foreground">— anything else (optional)</span>
        </h4>
        <textarea
          value={trailNotes}
          onChange={(e) => setTrailNotes(e.target.value)}
          placeholder="Additional thoughts, shout-outs, or suggestions..."
          rows={2}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-camp-green/30 resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
        size="lg"
      >
        {submitting ? "Sending..." : "🏕️ Submit Campfire Review (+5 pts)"}
      </Button>
    </Card>
  );
}
