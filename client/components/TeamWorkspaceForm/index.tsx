import { useState, useCallback, useEffect, useRef } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type Question = { section: string; questions: string[] };

type Props = {
  presentationId: number;
  teamId: number;
  camperId: number;
  questions: Question[];
  companyName?: string;
};

export default function TeamWorkspaceForm({ presentationId, teamId, camperId, questions, companyName }: Props) {
  const { data, loading, refetch } = useApiData("GetTeamWorkspace", {
    presentation_id: presentationId,
    team_id: teamId,
  });
  const { run: save, loading: saving } = useApi("SaveTeamWorkspace");

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const initialized = useRef(false);

  // Load saved answers
  useEffect(() => {
    if (data?.responses && !initialized.current) {
      setAnswers(data.responses);
      initialized.current = true;
    }
  }, [data]);

  const handleChange = useCallback((key: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await save({
        presentation_id: presentationId,
        team_id: teamId,
        camper_id: camperId,
        responses: JSON.stringify(answers),
      });
      setDirty(false);
      toast.success("Workspace saved! Your team can see these updates.");
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error(msg);
    }
  }, [presentationId, teamId, camperId, answers, save]);

  // Auto-save after 10s of inactivity
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (!dirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleSave();
    }, 10000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [dirty, handleSave]);

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Loading team workspace…</div>;

  // Count answered questions
  const totalQs = questions.reduce((sum, s) => sum + s.questions.length, 0);
  const answeredQs = Object.values(answers).filter((a) => a.trim().length > 0).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="users" className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-base">Team Workspace</h3>
          {companyName && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
              {companyName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{answeredQs}/{totalQs} answered</span>
          <Button onClick={handleSave} disabled={saving || !dirty} size="sm" variant={dirty ? "default" : "outline"}>
            {saving ? "Saving…" : dirty ? "Save Changes" : "Saved ✓"}
          </Button>
        </div>
      </div>

      {/* Collaborative note */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-200 text-xs text-emerald-700">
        <Icon icon="info" className="w-4 h-4 shrink-0" />
        <span>Any teammate can edit these fields. Changes save for the whole team. Auto-saves after 10 seconds of inactivity.</span>
      </div>

      {/* Question sections */}
      {questions.map((section, si) => (
        <Card key={si} className="overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-stone-100 to-stone-50 dark:from-stone-800 dark:to-stone-900 border-b">
            <h4 className="font-bold text-sm">{section.section}</h4>
          </div>
          <div className="divide-y">
            {section.questions.map((q, qi) => {
              const key = `s${si}_q${qi}`;
              return (
                <div key={key} className="p-4">
                  <label className="block text-sm font-medium text-foreground mb-2">{q}</label>
                  <textarea
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-y placeholder:text-muted-foreground"
                    placeholder="Type your team's answer here…"
                    value={answers[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      ))}

      {/* Bottom save */}
      {dirty && (
        <div className="sticky bottom-4 flex justify-center">
          <Button onClick={handleSave} disabled={saving} className="shadow-lg">
            {saving ? "Saving…" : "Save Team Workspace"}
          </Button>
        </div>
      )}
    </div>
  );
}
