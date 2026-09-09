import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

import PresentationWorkspace from "@/components/PresentationWorkspace";
import FiresideFinder from "@/components/FiresideFinder";
import TeamScoringPanel from "@/components/TeamScoringPanel";

type Presentation = {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  resources: any;
  prep_time_minutes: number | null;
  present_time_minutes: number | null;
  team_name: string | null;
  day_number: number | null;
  status: string;
  deck_template_url?: string | null;
  questions?: any[];
  presentation_type?: string | null;
  rubric_template_id?: number | null;
  is_locked?: boolean;
};

type Props = {
  presentation: Presentation;
  camperId: number;
  isAdmin: boolean;
  onBack: () => void;
  onRefresh: () => void;
};

export default function PresentationDetail({ presentation, camperId, isAdmin, onBack, onRefresh }: Props) {
  const initBingo = presentation.presentation_type === "bingo";
  const initQuestions = Array.isArray(presentation.questions) && presentation.questions.length > 0;
  const [activeSection, setActiveSection] = useState<string>(initBingo ? "bingo" : initQuestions ? "workspace" : "overview");

  const { data: detailData, loading, refetch } = useApiData("GetPresentationDetail", {
    presentation_id: presentation.id,
  });

  const feedback = (detailData?.feedback ?? []) as any[];
  const scores = (detailData?.scores ?? []) as any[];

  const resources = Array.isArray(presentation.resources) ? presentation.resources : [];
  const hasQuestions = Array.isArray(presentation.questions) && presentation.questions.length > 0;
  const isBingo = presentation.presentation_type === "bingo";
  const hasResources = resources.length > 0 || !!presentation.deck_template_url;
  const hasRubric = scores.length > 0 || !!presentation.rubric_template_id;
  const hasFeedback = feedback.length > 0;

  // Only show tabs that have content
  const sections = [
    { id: "overview", label: "Overview", icon: "file-text" },
    ...(isBingo ? [{ id: "bingo", label: "🔥 Bingo Card", icon: "grid" }] : []),
    ...(hasQuestions && !isBingo ? [{ id: "workspace", label: "Workspace", icon: "edit-3" }] : []),
    ...(hasResources ? [{ id: "resources", label: "Resources", icon: "link" }] : []),
    ...(hasRubric ? [{ id: "rubric", label: "Rubric", icon: "clipboard-check" }] : []),
    ...(hasFeedback ? [{ id: "feedback", label: `Feedback (${feedback.length})`, icon: "message-circle" }] : []),
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Back + Header */}
        <div>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <Icon icon="arrow-left" className="w-4 h-4" />
            Back to presentations
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{presentation.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                {presentation.team_name && (
                  <span className="flex items-center gap-1">
                    <Icon icon="users" className="w-4 h-4" />
                    {presentation.team_name}
                  </span>
                )}
                {presentation.day_number && (
                  <span className="flex items-center gap-1">
                    <Icon icon="calendar" className="w-4 h-4" />
                    Day {presentation.day_number}
                  </span>
                )}
                {presentation.prep_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Icon icon="clock" className="w-4 h-4" />
                    {presentation.prep_time_minutes}m prep
                  </span>
                )}
                {presentation.present_time_minutes && (
                  <span className="flex items-center gap-1">
                    <Icon icon="timer" className="w-4 h-4" />
                    {presentation.present_time_minutes}m present
                  </span>
                )}
              </div>
            </div>
            <div className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
              presentation.status === "in_progress"
                ? "text-green-400 bg-green-400/10 border-green-400/30"
                : presentation.status === "completed"
                  ? "text-muted-foreground bg-muted/30 border-border"
                  : "text-blue-400 bg-blue-400/10 border-blue-400/30"
            }`}>
              {presentation.status === "in_progress" ? "Live" : presentation.status === "completed" ? "Completed" : "Upcoming"}
            </div>
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 border-b border-border">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeSection === s.id
                  ? "border-purple-400 text-purple-400 bg-purple-400/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <Icon icon={s.icon as any} className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <>
            {activeSection === "overview" && (
              <OverviewSection presentation={presentation} />
            )}
            {activeSection === "bingo" && isBingo && (
              <FiresideFinder
                presentationId={presentation.id}
                camperId={camperId}
                isAdmin={isAdmin}
              />
            )}

            {activeSection === "workspace" && hasQuestions && (
              <PresentationWorkspace
                presentationId={presentation.id}
                camperId={camperId}
                questions={presentation.questions ?? []}
              />
            )}

            {activeSection === "resources" && (
              <ResourcesSection resources={resources} deckTemplateUrl={presentation.deck_template_url} />
            )}
            {activeSection === "rubric" && (
              presentation.rubric_template_id ? (
                <TeamScoringPanel
                  presentationId={presentation.id}
                  rubricTemplateId={presentation.rubric_template_id}
                  camperId={camperId}
                  isAdmin={isAdmin}
                />
              ) : (
                <RubricSection scores={scores} isAdmin={isAdmin} />
              )
            )}
            {activeSection === "feedback" && (
              <FeedbackSection
                feedback={feedback}
                camperId={camperId}
                presentationId={presentation.id}
                onSubmitted={refetch}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

import MarkdownText from "@/components/MarkdownText";

function OverviewSection({ presentation }: { presentation: Presentation }) {
  return (
    <div className="space-y-4">
      {presentation.description && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Icon icon="info" className="w-4 h-4 text-blue-400" />
            Description
          </h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{presentation.description}</p>
        </Card>
      )}
      {presentation.instructions && (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Icon icon="list-checks" className="w-4 h-4 text-green-400" />
            Instructions
          </h3>
          <MarkdownText text={presentation.instructions} className="text-muted-foreground" />
        </Card>
      )}
      {!presentation.description && !presentation.instructions && (
        <Card className="p-8 text-center">
          <Icon icon="file-text" className="w-10 h-10 mx-auto text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground mt-3">No overview details added yet.</p>
        </Card>
      )}
    </div>
  );
}

function ResourcesSection({ resources, deckTemplateUrl }: { resources: any[]; deckTemplateUrl?: string | null }) {
  const hasContent = resources.length > 0 || !!deckTemplateUrl;

  if (!hasContent) {
    return (
      <Card className="p-8 text-center">
        <Icon icon="link" className="w-10 h-10 mx-auto text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground mt-3">No resources attached yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Deck template — featured */}
      {deckTemplateUrl && (
        <Card className="p-4 border-purple-400/30 bg-purple-400/5">
          <a href={deckTemplateUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-400/20 flex items-center justify-center">
              <Icon icon="file-down" className="w-5 h-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Presentation Deck Template</p>
              <p className="text-xs text-muted-foreground">Download or make a copy to start building your deck</p>
            </div>
            <Icon icon="external-link" className="w-4 h-4 text-purple-400" />
          </a>
        </Card>
      )}

      {/* Other resources */}
      {resources.map((r: any, i: number) => (
        <Card key={i} className="p-4 hover:border-purple-400/30 transition-colors">
          <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-purple-400/10 flex items-center justify-center">
              <Icon icon="external-link" className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{r.label || r.url}</p>
              <p className="text-xs text-muted-foreground truncate">{r.url}</p>
            </div>
          </a>
        </Card>
      ))}
    </div>
  );
}

function RubricSection({ scores, isAdmin }: { scores: any[]; isAdmin: boolean }) {
  if (scores.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Icon icon="clipboard-check" className="w-10 h-10 mx-auto text-muted-foreground/20" />
        <p className="text-sm text-muted-foreground mt-3">
          {isAdmin ? "No rubric criteria set for this presentation." : "Rubric scores will appear here after your presentation."}
        </p>
      </Card>
    );
  }

  const totalMax = scores.reduce((sum, s) => sum + (s.max_points ?? 0), 0);
  const totalEarned = scores.reduce((sum, s) => sum + (s.score ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="p-4 bg-purple-400/5 border-purple-400/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Total Score</span>
          <span className="text-lg font-bold text-purple-400">{totalEarned} / {totalMax}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-purple-400 rounded-full transition-all"
            style={{ width: totalMax > 0 ? `${(totalEarned / totalMax) * 100}%` : "0%" }}
          />
        </div>
      </Card>

      {/* Criteria */}
      <div className="space-y-2">
        {scores.map((s: any) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{s.criterion}</span>
              <span className={`text-sm font-bold ${s.score != null ? "text-purple-400" : "text-muted-foreground"}`}>
                {s.score ?? "—"} / {s.max_points}
              </span>
            </div>
            {s.notes && <p className="text-xs text-muted-foreground mt-1">{s.notes}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}

function FeedbackSection({
  feedback,
  camperId,
  presentationId,
  onSubmitted,
}: {
  feedback: any[];
  camperId: number;
  presentationId: number;
  onSubmitted: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const hasSubmitted = feedback.some((f) => f.submitted_by === camperId);

  return (
    <div className="space-y-4">
      {/* Submit button */}
      {!hasSubmitted && !showForm && (
        <Button onClick={() => setShowForm(true)} className="bg-purple-600 hover:bg-purple-700">
          <Icon icon="message-circle" className="w-4 h-4 mr-1.5" />
          Submit Feedback
        </Button>
      )}
      {hasSubmitted && !showForm && (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <Icon icon="check-circle" className="w-4 h-4" />
          You&apos;ve submitted your feedback!
          <button onClick={() => setShowForm(true)} className="underline text-xs text-muted-foreground ml-2">Edit</button>
        </div>
      )}

      {showForm && (
        <FeedbackForm
          presentationId={presentationId}
          camperId={camperId}
          existingFeedback={feedback.find((f) => f.submitted_by === camperId)}
          onClose={() => setShowForm(false)}
          onSubmitted={onSubmitted}
        />
      )}

      {/* Existing feedback list */}
      {feedback.length === 0 && !showForm ? (
        <Card className="p-8 text-center">
          <Icon icon="message-circle" className="w-10 h-10 mx-auto text-muted-foreground/20" />
          <p className="text-sm text-muted-foreground mt-3">No feedback submitted yet. Be the first!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {feedback.map((f) => (
            <Card key={f.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{f.submitter_name || "Anonymous"}</span>
                <div className="flex items-center gap-1">
                  {f.rating && Array.from({ length: 5 }).map((_, i) => (
                    <Icon key={i} icon="star" className={`w-3 h-3 ${i < f.rating ? "text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
              </div>
              {f.strengths && (
                <div className="mb-1">
                  <span className="text-[10px] font-semibold text-green-400 uppercase">Strengths</span>
                  <p className="text-xs text-muted-foreground">{f.strengths}</p>
                </div>
              )}
              {f.improvements && (
                <div className="mb-1">
                  <span className="text-[10px] font-semibold text-amber-400 uppercase">Improvements</span>
                  <p className="text-xs text-muted-foreground">{f.improvements}</p>
                </div>
              )}
              {f.comment && (
                <p className="text-xs text-muted-foreground mt-1">{f.comment}</p>
              )}
              <p className="text-[10px] text-muted-foreground/50 mt-2">
                {new Date(f.created_at).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FeedbackForm({
  presentationId,
  camperId,
  existingFeedback,
  onClose,
  onSubmitted,
}: {
  presentationId: number;
  camperId: number;
  existingFeedback?: any;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState<number>(existingFeedback?.rating ?? 0);
  const [strengths, setStrengths] = useState(existingFeedback?.strengths ?? "");
  const [improvements, setImprovements] = useState(existingFeedback?.improvements ?? "");
  const [comment, setComment] = useState(existingFeedback?.comment ?? "");
  const { run: submit, loading } = useApi("SubmitPresentationFeedback");

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    try {
      await submit({
        presentation_id: presentationId,
        submitted_by: camperId,
        rating,
        strengths: strengths.trim() || null,
        improvements: improvements.trim() || null,
        comment: comment.trim() || null,
      });
      toast.success("Feedback submitted! +2 pts");
      onClose();
      onSubmitted();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [rating, strengths, improvements, comment, presentationId, camperId, submit, onClose, onSubmitted]);

  return (
    <Card className="p-5 border-purple-400/20 bg-purple-400/5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Your Feedback</h3>
      <div className="space-y-4">
        {/* Star rating */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-0.5"
              >
                <Icon icon="star" className={`w-6 h-6 ${star <= rating ? "text-amber-400" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Strengths</label>
          <Textarea
            value={strengths}
            onChange={(e) => setStrengths(e.target.value)}
            placeholder="What did they do well?"
            rows={2}
            className="bg-muted/30"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Areas for Improvement</label>
          <Textarea
            value={improvements}
            onChange={(e) => setImprovements(e.target.value)}
            placeholder="What could be improved?"
            rows={2}
            className="bg-muted/30"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Additional Comments</label>
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any other thoughts?"
            className="bg-muted/30"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={loading || rating === 0} className="bg-purple-600 hover:bg-purple-700">
            {loading ? "Submitting..." : "Submit Feedback"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Card>
  );
}
