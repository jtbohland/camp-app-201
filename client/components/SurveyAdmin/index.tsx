import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

interface Props {
  counselorId: number;
}

interface SurveyListItem {
  id: number;
  title: string;
  day_number: number;
  is_active: boolean;
  response_count: number;
  total_campers: number;
  created_at: string;
}

interface ResponseItem {
  camper_name: string;
  team_name: string | null;
  answers: Record<string, unknown>;
  submitted_at: string;
}

const DEFAULT_QUESTIONS = [
  { id: "q1", text: "How would you rate today's sessions overall?", type: "rating" as const },
  { id: "q2", text: "What was the most valuable thing you learned today?", type: "text" as const },
  { id: "q3", text: "How confident do you feel applying today's material?", type: "rating" as const },
  { id: "q4", text: "What could be improved for tomorrow?", type: "text" as const },
  { id: "q5", text: "How engaged were you today?", type: "multiple_choice" as const, options: ["Extremely engaged", "Very engaged", "Moderately engaged", "Slightly engaged", "Not engaged"] },
];

export default function SurveyAdmin({ counselorId }: Props) {
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, loading, fetching, refetch } = useApiData("GetSurveyResults", {
    survey_id: selectedSurveyId,
  });

  const surveys: SurveyListItem[] = data?.surveys ?? [];
  const responses: ResponseItem[] = (data?.responses ?? []).map((r: any) => ({
    camper_name: r.camper_name ?? "",
    team_name: r.team_name ?? null,
    answers: (r.answers ?? {}) as Record<string, unknown>,
    submitted_at: r.submitted_at ?? "",
  }));

  // When surveys load and none selected, auto-select the active one
  const activeSurvey = useMemo(() => surveys.find((s) => s.is_active), [surveys]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-600/20">
            <Icon icon="bar-chart-3" className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Survey Management</h2>
            <p className="text-xs text-muted-foreground">{surveys.length} surveys created</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-amber-600 hover:bg-amber-700"
        >
          <Icon icon="plus" className="w-4 h-4 mr-1.5" />
          {showCreate ? "Cancel" : "New Survey"}
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <CreateSurveyForm
          counselorId={counselorId}
          onSuccess={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}

      {/* Survey Selector */}
      {surveys.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Select
              value={selectedSurveyId?.toString() ?? (activeSurvey?.id.toString() ?? "")}
              onValueChange={(val) => setSelectedSurveyId(Number(val))}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a survey..." />
              </SelectTrigger>
              <SelectContent>
                {surveys.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    <span className="flex items-center gap-2">
                      {s.is_active && <span className="w-2 h-2 rounded-full bg-green-500" />}
                      Day {s.day_number}: {s.title}
                      <span className="text-muted-foreground ml-1">
                        ({s.response_count}/{s.total_campers})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      )}

      {/* Completion Overview */}
      {surveys.length > 0 && (
        <SurveyCompletionCards surveys={surveys} />
      )}

      {/* Responses Table */}
      {responses.length > 0 ? (
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Icon icon="message-square" className="w-4 h-4 text-muted-foreground" />
            Responses ({responses.length})
          </h3>
          <div className={`space-y-3 ${fetching ? "opacity-70" : ""}`}>
            {responses.map((resp, idx) => (
              <ResponseCard key={idx} response={resp} />
            ))}
          </div>
        </Card>
      ) : !loading && surveys.length > 0 ? (
        <Card className="p-8 text-center">
          <Icon icon="inbox" className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground mt-2">No responses yet</p>
        </Card>
      ) : null}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 h-16 animate-pulse bg-muted/30" />
          ))}
        </div>
      )}
    </div>
  );
}

function SurveyCompletionCards({ surveys }: { surveys: SurveyListItem[] }) {
  const active = surveys.find((s) => s.is_active);
  if (!active) return null;

  const pct = active.total_campers > 0 ? Math.round((active.response_count / active.total_campers) * 100) : 0;

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-amber-400">{active.response_count}</p>
        <p className="text-xs text-muted-foreground">Responses</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-2xl font-bold text-foreground">{active.total_campers}</p>
        <p className="text-xs text-muted-foreground">Total Campers</p>
      </Card>
      <Card className="p-4 text-center">
        <p className={`text-2xl font-bold ${pct === 100 ? "text-green-400" : "text-foreground"}`}>{pct}%</p>
        <p className="text-xs text-muted-foreground">Complete</p>
      </Card>
    </div>
  );
}

function ResponseCard({ response }: { response: ResponseItem }) {
  const [expanded, setExpanded] = useState(false);
  const answerEntries = Object.entries(response.answers);

  return (
    <div className="p-3 rounded-lg border border-border bg-muted/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{response.camper_name}</span>
          {response.team_name && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {response.team_name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {new Date(response.submitted_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon icon={expanded ? "chevron-up" : "chevron-down"} className="w-4 h-4" />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {answerEntries.map(([key, val]) => (
            <div key={key} className="text-xs">
              <span className="text-muted-foreground">{key}:</span>{" "}
              <span className="text-foreground">
                {typeof val === "number" ? `${"★".repeat(val)}${"☆".repeat(5 - val)}` : String(val)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateSurveyForm({ counselorId, onSuccess }: { counselorId: number; onSuccess: () => void }) {
  const [title, setTitle] = useState("End of Day Reflection");
  const [description, setDescription] = useState("");
  const [dayNumber, setDayNumber] = useState("1");
  const [points, setPoints] = useState("5");
  const [teamBonus, setTeamBonus] = useState("3");
  const { run: createSurvey, loading } = useApi("CreateSurvey");

  const handleCreate = useCallback(async () => {
    try {
      const result = await createSurvey({
        title,
        description: description || null,
        questions: DEFAULT_QUESTIONS,
        day_number: Number(dayNumber),
        points_per_completion: Number(points),
        team_bonus_points: Number(teamBonus),
        created_by: counselorId,
      });
      if (result?.success) {
        toast.success(`Survey created for Day ${dayNumber}!`);
        onSuccess();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [title, description, dayNumber, points, teamBonus, counselorId, createSurvey, onSuccess]);

  return (
    <Card className="p-5 border-amber-700/30 bg-amber-900/10">
      <h3 className="text-sm font-semibold text-foreground mb-4">Create Daily Survey</h3>
      <div className="grid gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-muted/30" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Quick end-of-day reflection..."
            className="bg-muted/30 min-h-[60px]"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Day #</label>
            <Input value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} type="number" min="1" className="bg-muted/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Points</label>
            <Input value={points} onChange={(e) => setPoints(e.target.value)} type="number" min="0" className="bg-muted/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Team Bonus</label>
            <Input value={teamBonus} onChange={(e) => setTeamBonus(e.target.value)} type="number" min="0" className="bg-muted/30" />
          </div>
        </div>
        <div className="p-3 rounded-lg bg-muted/20 border border-border">
          <p className="text-xs text-muted-foreground mb-2">Default questions (5):</p>
          <ul className="space-y-1">
            {DEFAULT_QUESTIONS.map((q, i) => (
              <li key={i} className="text-xs text-foreground/70 flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px]">{i + 1}</span>
                <span className="truncate">{q.text}</span>
                <span className="text-muted-foreground/60 text-[10px] ml-auto">{q.type}</span>
              </li>
            ))}
          </ul>
        </div>
        <Button onClick={handleCreate} disabled={loading || !title.trim()} className="bg-amber-600 hover:bg-amber-700">
          {loading ? (
            <>
              <Icon icon="loader-2" className="w-4 h-4 mr-1.5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Icon icon="plus" className="w-4 h-4 mr-1.5" />
              Create & Activate
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
