import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import WorkspaceQuestion, { type QuestionState } from "./WorkspaceQuestion.js";

type Question = { section: string; questions: string[] };

type Props = {
  presentationId: number;
  teamId: number;
  /** Kept for callers; who saved is taken from sign-in on the server. */
  camperId: number;
  questions: Question[];
  companyName?: string;
};

const EMPTY: QuestionState = { draft: "", saved: "", savedAt: null, savedBy: null, saving: false, conflict: null };

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

/**
 * Shared team workspace. Every question has its own Save button and saves only that answer,
 * so teammates can split up the questions without overwriting each other.
 * Teammates' saved answers show up automatically (checks every 10 seconds).
 */
export default function TeamWorkspaceForm({ presentationId, teamId, questions, companyName }: Props) {
  const { data, loading, refetch } = useApiData(
    "GetTeamWorkspace",
    { presentation_id: presentationId, team_id: teamId },
    { refetchInterval: 10_000, refetchOnWindowFocus: true }
  );
  const { run: saveAnswer } = useApi("SaveTeamWorkspace");
  const [qs, setQs] = useState<Record<string, QuestionState>>({});
  const qsRef = useRef(qs);
  qsRef.current = qs;

  const keys = useMemo(
    () => questions.flatMap((s, si) => s.questions.map((_, qi) => `s${si}_q${qi}`)),
    [questions]
  );

  // Pull in teammates' saved answers. Questions you're editing keep your text.
  useEffect(() => {
    if (!data) return;
    setQs((prev) => {
      const next = { ...prev };
      for (const key of keys) {
        const cur = prev[key] ?? EMPTY;
        const serverAnswer = data.responses[key] ?? "";
        const m = data.meta[key];
        const editing = cur.draft !== cur.saved || cur.saving || cur.conflict !== null;
        if (editing) continue;
        if (serverAnswer !== cur.saved || (m?.saved_at ?? null) !== cur.savedAt) {
          next[key] = { ...cur, draft: serverAnswer, saved: serverAnswer, savedAt: m?.saved_at ?? null, savedBy: m?.saved_by_name ?? null };
        }
      }
      return next;
    });
  }, [data, keys]);

  const patch = useCallback((key: string, p: Partial<QuestionState>) => {
    setQs((prev) => ({ ...prev, [key]: { ...(prev[key] ?? EMPTY), ...p } }));
  }, []);

  const handleChange = useCallback((key: string, value: string) => patch(key, { draft: value }), [patch]);

  const handleUseTheirs = useCallback((key: string) => {
    const c = qsRef.current[key]?.conflict;
    if (!c) return;
    patch(key, { draft: c.answer, saved: c.answer, conflict: null });
    void refetch();
  }, [patch, refetch]);

  /** Saves one question. Returns true when it saved. */
  const handleSave = useCallback(async (key: string, force: boolean): Promise<boolean> => {
    const cur = qsRef.current[key] ?? EMPTY;
    if (cur.saving) return false;
    const answer = cur.draft;
    patch(key, { saving: true });
    try {
      const res = await saveAnswer({
        presentation_id: presentationId,
        team_id: teamId,
        question_key: key,
        answer,
        expected_saved_at: cur.savedAt,
        force,
      });
      if (!res) throw new Error("No response from the server.");
      if (res.status === "conflict") {
        patch(key, {
          saving: false,
          savedAt: res.saved_at,
          savedBy: res.saved_by_name,
          conflict: { answer: res.current_answer ?? "", by: res.saved_by_name },
        });
        toast.warning(`${res.saved_by_name ?? "A teammate"} just saved this question too. Pick which answer to keep.`);
        return false;
      }
      setQs((prev) => {
        const now = prev[key] ?? EMPTY;
        // If they kept typing while it saved, keep the newer text as unsaved.
        return { ...prev, [key]: { ...now, saving: false, conflict: null, saved: answer, savedAt: res.saved_at, savedBy: res.saved_by_name } };
      });
      return true;
    } catch (err) {
      patch(key, { saving: false });
      toast.error("Couldn't save that answer: " + errorText(err));
      return false;
    }
  }, [patch, saveAnswer, presentationId, teamId]);

  const handleSaveOne = useCallback(async (key: string, force: boolean) => {
    if (await handleSave(key, force)) toast.success("Answer saved. Your team will see it.");
  }, [handleSave]);

  const dirtyKeys = keys.filter((k) => {
    const s = qs[k];
    return s && s.draft !== s.saved && !s.conflict;
  });
  const [savingAll, setSavingAll] = useState(false);
  const handleSaveAll = useCallback(async () => {
    setSavingAll(true);
    let ok = 0;
    for (const k of dirtyKeys) if (await handleSave(k, false)) ok++;
    setSavingAll(false);
    if (ok > 0) toast.success(`${ok} answer${ok === 1 ? "" : "s"} saved.`);
  }, [dirtyKeys, handleSave]);

  // Warn before leaving the page with unsaved answers.
  const hasUnsaved = dirtyKeys.length > 0;
  useEffect(() => {
    if (!hasUnsaved) return;
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [hasUnsaved]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading team workspace…</div>;

  const answeredQs = keys.filter((k) => (qs[k]?.saved ?? "").trim().length > 0).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon icon="users" className="h-5 w-5 text-emerald-600" />
          <h3 className="text-base font-bold">Team Workspace</h3>
          {companyName && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">{companyName}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{answeredQs}/{keys.length} answered</span>
          {hasUnsaved && (
            <Button size="sm" onClick={handleSaveAll} disabled={savingAll}>
              {savingAll ? "Saving…" : `Save all my answers (${dirtyKeys.length})`}
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
        <Icon icon="info" className="h-4 w-4 shrink-0" />
        <span>
          Split up the questions! Press <b>Save answer</b> under each one when it's done. Only that question saves,
          and your teammates' answers show up here automatically.
        </span>
      </div>

      {questions.map((section, si) => (
        <Card key={si} className="overflow-hidden">
          <div className="border-b bg-gradient-to-r from-stone-100 to-stone-50 p-3">
            <h4 className="text-sm font-bold">{section.section}</h4>
          </div>
          <div className="divide-y">
            {section.questions.map((q, qi) => {
              const key = `s${si}_q${qi}`;
              return (
                <WorkspaceQuestion
                  key={key}
                  questionKey={key}
                  label={q}
                  state={qs[key] ?? EMPTY}
                  onChange={handleChange}
                  onSave={handleSaveOne}
                  onUseTheirs={handleUseTheirs}
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
