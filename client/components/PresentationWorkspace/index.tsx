import { useState, useCallback, useEffect, useRef } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type QuestionSection = {
  section: string;
  questions: string[];
};

type PresentationWorkspaceProps = {
  presentationId: number;
  camperId: number;
  questions: QuestionSection[];
};

export default function PresentationWorkspace({ presentationId, camperId, questions }: PresentationWorkspaceProps) {
  const { data, loading } = useApiData("GetPresentationResponses", {
    presentation_id: presentationId,
    camper_id: camperId,
  }, { enabled: camperId > 0 });

  const { run: saveResponses, loading: saving } = useApi("SavePresentationResponses");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Load saved responses
  useEffect(() => {
    if (data?.responses) {
      setAnswers(data.responses);
    }
  }, [data]);

  // Build a flat key for each question: "s0_q0", "s0_q1", "s1_q0", etc.
  const getKey = (sectionIdx: number, questionIdx: number) => `s${sectionIdx}_q${questionIdx}`;

  const handleChange = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setDirty(true);

    // Auto-save after 2 seconds of inactivity
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      // Will be triggered by the save effect
    }, 2000);
  }, []);

  // Cleanup timer
  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  const handleSave = useCallback(async () => {
    try {
      await saveResponses({
        presentation_id: presentationId,
        camper_id: camperId,
        responses: JSON.stringify(answers),
      });
      setDirty(false);
      toast.success("Responses saved!");
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Failed to save: " + message);
    }
  }, [answers, presentationId, camperId, saveResponses]);

  // Count answered questions
  const totalQuestions = questions.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredCount = Object.values(answers).filter((a) => a?.trim()).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (questions.length === 0) return null;
  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading your workspace...</div>;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            Your Progress
          </span>
          <span className="text-sm text-muted-foreground">
            {answeredCount}/{totalQuestions} answered
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-camp-green rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent === 100 && (
          <p className="text-xs text-camp-green mt-2 flex items-center gap-1">
            <Icon icon="check-circle" className="w-3.5 h-3.5" />
            All questions answered!
          </p>
        )}
      </Card>

      {/* Question sections */}
      {questions.map((section, sIdx) => (
        <Card key={sIdx} className="p-5">
          <h3 className="text-base font-bold text-foreground mb-4">{section.section}</h3>
          <div className="space-y-4">
            {section.questions.map((question, qIdx) => {
              const key = getKey(sIdx, qIdx);
              const value = answers[key] ?? "";
              const isAnswered = value.trim().length > 0;
              return (
                <div key={key} className="space-y-1.5">
                  <label className="flex items-start gap-2 text-sm text-foreground">
                    <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      isAnswered
                        ? "bg-camp-green/20 text-camp-green"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isAnswered ? "✓" : qIdx + 1}
                    </span>
                    {question}
                  </label>
                  <Textarea
                    value={value}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={2}
                    className="ml-7 text-sm"
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Save button */}
      <div className="sticky bottom-0 bg-background border-t border-border py-3 px-1 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {dirty ? (
            <span className="text-amber-500 flex items-center gap-1">
              <Icon icon="circle" className="w-2 h-2 fill-current" />
              Unsaved changes
            </span>
          ) : data?.hasResponses ? (
            <span className="text-camp-green flex items-center gap-1">
              <Icon icon="check" className="w-3.5 h-3.5" />
              All changes saved
            </span>
          ) : null}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Icon icon="loader-2" className="w-4 h-4 animate-spin mr-1.5" />
              Saving...
            </>
          ) : (
            <>
              <Icon icon="save" className="w-4 h-4 mr-1.5" />
              Save Responses
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
