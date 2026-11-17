import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AnswerQuestion, { type AnswerState } from "./AnswerQuestion.js";

type QuestionSection = {
  section: string;
  questions: string[];
};

type PresentationWorkspaceProps = {
  presentationId: number;
  camperId: number;
  questions: QuestionSection[];
};

const EMPTY: AnswerState = { draft: "", saved: "", savedAt: null, saving: false };

function errorText(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return String(err);
}

/**
 * A cAMPer's own answers for a presentation. Every question has its own Save button and saves only
 * that answer, so one save can never wipe out another.
 */
export default function PresentationWorkspace({ presentationId, camperId, questions }: PresentationWorkspaceProps) {
  const { data, loading } = useApiData(
    "GetPresentationResponses",
    { presentation_id: presentationId, camper_id: camperId },
    { enabled: camperId > 0 }
  );
  const { run: saveAnswer } = useApi("SavePresentationResponses");

  const [qs, setQs] = useState<Record<string, AnswerState>>({});
  const qsRef = useRef(qs);
  qsRef.current = qs;

  const keys = useMemo(
    () => questions.flatMap((s, si) => s.questions.map((_, qi) => `s${si}_q${qi}`)),
    [questions]
  );

  // Load saved answers. Boxes you're editing keep your text.
  useEffect(() => {
    if (!data?.responses) return;
    setQs((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        const cur = prev[key] ?? EMPTY;
        if (cur.draft !== cur.saved || cur.saving) continue;
        const serverAnswer = data.responses[key] ?? "";
        if (serverAnswer !== cur.saved) {
          next[key] = { ...cur, draft: serverAnswer, saved: serverAnswer, savedAt: serverAnswer ? "loaded" : null };
        }
      }
      return next;
    });
  }, [data, keys]);

  const patch = useCallback((key: string, p: Partial<AnswerState>) => {
    setQs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY), ...p } }));
  }, []);

  const handleChange = useCallback((key: string, value: string) => patch(key, { draft: value }), [patch]);

  /** Saves one question. Returns true when it saved. */
  const handleSave = useCallback(
    async (key: string): Promise<boolean> => {
      const cur = qsRef.current[key] ?? EMPTY;
      if (cur.saving) return false;
      const answer = cur.draft;
      patch(key, { saving: true });
      try {
        const res = await saveAnswer({ presentation_id: presentationId, question_key: key, answer });
        // If they kept typing while it saved, the newer text stays unsaved.
        setQs((prev) => ({
          ...prev,
          [key]: { ...(prev[key] ?? EMPTY), saving: false, saved: answer, savedAt: res?.saved_at ?? new Date().toISOString() },
        }));
        return true;
      } catch (err) {
        patch(key, { saving: false });
        toast.error("Couldn't save that answer: " + errorText(err));
        return false;
      }
    },
    [patch, saveAnswer, presentationId]
  );

  const handleSaveOne = useCallback(
    async (key: string) => {
      if (await handleSave(key)) toast.success("Answer saved.");
    },
    [handleSave]
  );

  const dirtyKeys = keys.filter((k) => {
    const s = qs[k];
    return s && s.draft !== s.saved;
  });
  const hasUnsaved = dirtyKeys.length > 0;
  const [savingAll, setSavingAll] = useState(false);
  const handleSaveAll = useCallback(async () => {
    setSavingAll(true);
    let ok = 0;
    for (const k of dirtyKeys) if (await handleSave(k)) ok++;
    setSavingAll(false);
    if (ok > 0) toast.success(`${ok} answer${ok === 1 ? "" : "s"} saved.`);
  }, [dirtyKeys, handleSave]);

  // Warn before leaving the page with unsaved answers.
  useEffect(() => {
    if (!hasUnsaved) return;
    const onLeave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [hasUnsaved]);

  const totalQuestions = keys.length;
  const answeredCount = keys.filter((k) => (qs[k]?.saved ?? "").trim().length > 0).length;
  const progressPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  if (questions.length === 0) return null;
  if (loading) return <div className="text-sm text-muted-foreground p-4">Loading your workspace...</div>;

  return (
    <div className="min-w-0 space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Your Progress</span>
          <span className="text-sm text-muted-foreground">
            {answeredCount}/{totalQuestions} saved
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-camp-green rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>
        {progressPercent === 100 && (
          <p className="text-xs text-camp-green mt-2 flex items-center gap-1">
            <Icon icon="check-circle" className="w-3.5 h-3.5" />
            All questions answered!
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Press <b>Save answer</b> under each question when it's done.</p>
      </Card>

      {questions.map((section, sIdx) => (
        <Card key={sIdx} className="min-w-0 overflow-hidden p-5">
          <h3 className="text-base font-bold text-foreground mb-4">{section.section}</h3>
          <div className="space-y-5">
            {section.questions.map((question, qIdx) => {
              const key = `s${sIdx}_q${qIdx}`;
              return (
                <AnswerQuestion
                  key={key}
                  questionKey={key}
                  number={qIdx + 1}
                  label={question}
                  state={qs[key] ?? EMPTY}
                  onChange={handleChange}
                  onSave={handleSaveOne}
                />
              );
            })}
          </div>
        </Card>
      ))}

      {hasUnsaved && (
        <div className="sticky bottom-4 flex justify-center">
          <Button onClick={handleSaveAll} disabled={savingAll} className="shadow-lg">
            {savingAll ? "Saving…" : `Save all my answers (${dirtyKeys.length})`}
          </Button>
        </div>
      )}
    </div>
  );
}
