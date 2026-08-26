import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

interface Question {
  id: string;
  text: string;
  type: "rating" | "text" | "multiple_choice";
  options?: string[];
}

interface SurveyData {
  id: number;
  title: string;
  description: string | null;
  questions: Question[];
  day_number: number;
  points_per_completion: number;
  team_bonus_points: number;
}

interface TeamCompletion {
  submitted: number;
  total: number;
  all_complete: boolean;
}

interface Props {
  survey: SurveyData;
  camperId: number;
  teamCompletion: TeamCompletion | null;
  onSubmitSuccess: (points: number, teamBonus: boolean) => void;
}

export default function SurveyForm({ survey, camperId, teamCompletion, onSubmitSuccess }: Props) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const { run: submitSurvey, loading: submitting } = useApi("SubmitSurvey");

  const questions: Question[] = Array.isArray(survey.questions) ? survey.questions : [];

  const updateAnswer = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const allAnswered = questions.every((q) => {
    const val = answers[q.id];
    if (q.type === "text") return typeof val === "string" && val.trim().length > 0;
    return val !== undefined && val !== null && val !== "";
  });

  const handleSubmit = useCallback(async () => {
    if (!allAnswered) {
      toast.error("Please answer all questions before submitting");
      return;
    }
    try {
      const result = await submitSurvey({
        survey_id: survey.id,
        camper_id: camperId,
        answers,
      });
      if (result?.success) {
        onSubmitSuccess(result.points_awarded, result.team_bonus_awarded);
      } else {
        toast.error(result?.error ?? "Failed to submit survey");
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [allAnswered, answers, camperId, onSubmitSuccess, submitSurvey, survey.id]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-amber-900/20 to-orange-900/20 border-amber-700/30">
        <div className="flex items-start gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-amber-600/20">
            <Icon icon="clipboard-list" className="w-6 h-6 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{survey.title}</h2>
            {survey.description && (
              <p className="text-sm text-muted-foreground mt-1">{survey.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Icon icon="calendar-days" className="w-3.5 h-3.5" />
                Day {survey.day_number}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="star" className="w-3.5 h-3.5 text-amber-400" />
                +{survey.points_per_completion} pts
              </span>
              {survey.team_bonus_points > 0 && (
                <span className="flex items-center gap-1">
                  <Icon icon="users" className="w-3.5 h-3.5 text-green-400" />
                  +{survey.team_bonus_points} team bonus
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Team Progress */}
      {teamCompletion && (
        <Card className="p-4 border-green-700/30 bg-green-900/10">
          <div className="flex items-center gap-3">
            <Icon icon="users" className="w-5 h-5 text-green-400" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-300 font-medium">Team Completion</span>
                <span className="text-muted-foreground">
                  {teamCompletion.submitted}/{teamCompletion.total}
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${teamCompletion.total > 0 ? (teamCompletion.submitted / teamCompletion.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Questions */}
      <div className="space-y-4">
        {questions.map((question, idx) => (
          <Card key={question.id} className="p-5">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                {question.text}
              </p>

              {question.type === "rating" && (
                <RatingInput
                  value={answers[question.id] as number | undefined}
                  onChange={(val) => updateAnswer(question.id, val)}
                />
              )}

              {question.type === "text" && (
                <Textarea
                  placeholder="Share your thoughts..."
                  value={(answers[question.id] as string) ?? ""}
                  onChange={(e) => updateAnswer(question.id, e.target.value)}
                  className="min-h-[80px] bg-muted/30"
                />
              )}

              {question.type === "multiple_choice" && question.options && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateAnswer(question.id, option)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left text-sm transition-colors ${
                        answers[question.id] === option
                          ? "border-amber-500 bg-amber-500/10 text-foreground"
                          : "border-border hover:bg-muted/30 text-foreground/80"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        answers[question.id] === option
                          ? "border-amber-500"
                          : "border-muted-foreground/40"
                      }`}>
                        {answers[question.id] === option && (
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </div>
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full py-6 text-base font-semibold bg-amber-600 hover:bg-amber-700"
      >
        {submitting ? (
          <>
            <Icon icon="loader-2" className="w-5 h-5 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Icon icon="send" className="w-5 h-5 mr-2" />
            Submit Survey
          </>
        )}
      </Button>
    </div>
  );
}

function RatingInput({ value, onChange }: { value: number | undefined; onChange: (val: number) => void; }) {
  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className="group p-1 transition-transform hover:scale-110"
        >
          <Icon
            icon="star"
            className={`w-7 h-7 transition-colors ${
              value && star <= value
                ? "text-amber-400 fill-amber-400"
                : "text-muted-foreground/30 group-hover:text-amber-400/50"
            }`}
          />
        </button>
      ))}
      {value && (
        <span className="ml-2 text-sm text-muted-foreground">{value}/5</span>
      )}
    </div>
  );
}
