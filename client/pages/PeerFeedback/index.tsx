import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "liked", label: "What I Liked", icon: "heart", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { value: "went_well", label: "Went Well", icon: "thumbs-up", color: "text-green-400 bg-green-500/10 border-green-500/30" },
  { value: "missed_opportunity", label: "Missed Opportunity", icon: "lightbulb", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "feedback", label: "General Feedback", icon: "message-circle", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
] as const;

const POINTS_PER_FEEDBACK = 2;

export default function PeerFeedbackPage() {
  const user = useSuperblocksUser();
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [showSubmit, setShowSubmit] = useState(false);

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;

  const { data: teamsData } = useApiData("GetTeams", { camper_id: null });
  const teams = teamsData?.teams ?? [];

  const { data, loading, fetching, refetch } = useApiData("GetPeerFeedback", {
    session_label: sessionFilter === "all" ? null : sessionFilter,
    team_id: null,
  }, { refetchInterval: 15000 }); // Auto-refresh every 15s for live view

  const feedback = data?.feedback ?? [];
  const sessions = data?.sessions ?? [];

  // Group by category for the board view
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, typeof feedback>();
    for (const item of feedback) {
      const arr = map.get(item.category) ?? [];
      arr.push(item);
      map.set(item.category, arr);
    }
    return map;
  }, [feedback]);

  if (loadingCamper || loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Icon icon="message-square" className="w-6 h-6 text-amber-400" />
            Peer Feedback Board
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live feedback during presentations • {feedback.length} entries • +{POINTS_PER_FEEDBACK} pts each
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue placeholder="All Sessions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowSubmit(!showSubmit)} className="bg-amber-600 hover:bg-amber-700">
            <Icon icon={showSubmit ? "x" : "plus"} className="w-4 h-4 mr-1.5" />
            {showSubmit ? "Cancel" : "Give Feedback"}
          </Button>
        </div>
      </div>

      {/* Submit form */}
      {showSubmit && (
        <SubmitFeedbackForm
          camperId={camperId}
          teams={teams}
          sessions={sessions}
          onSuccess={() => { setShowSubmit(false); refetch(); }}
        />
      )}

      {/* Board columns */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${fetching ? "opacity-70" : ""}`}>
        {CATEGORIES.map((cat) => {
          const items = groupedByCategory.get(cat.value) ?? [];
          return (
            <div key={cat.value}>
              <div className={`rounded-lg border p-3 mb-3 ${cat.color}`}>
                <div className="flex items-center gap-2">
                  <Icon icon={cat.icon as any} className="w-4 h-4" />
                  <span className="text-xs font-semibold">{cat.label}</span>
                  <span className="text-[10px] ml-auto opacity-70">{items.length}</span>
                </div>
              </div>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No entries yet</p>
                ) : (
                  items.map((item) => (
                    <FeedbackCard key={item.id} item={item} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeedbackCard({ item }: { item: any }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-foreground">{item.content}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">{item.author_name}</span>
        {item.team_name && (
          <span className="text-[10px] text-amber-400/80">{item.team_name}</span>
        )}
      </div>
    </Card>
  );
}

function SubmitFeedbackForm({
  camperId,
  teams,
  sessions,
  onSuccess,
}: {
  camperId: number;
  teams: any[];
  sessions: string[];
  onSuccess: () => void;
}) {
  const [sessionLabel, setSessionLabel] = useState(sessions[0] ?? "");
  const [newSession, setNewSession] = useState("");
  const [teamId, setTeamId] = useState<string>("none");
  const [category, setCategory] = useState<string>("liked");
  const [content, setContent] = useState("");
  const { run: submitFeedback, loading } = useApi("SubmitPeerFeedback");

  const effectiveSession = newSession.trim() || sessionLabel;

  const handleSubmit = useCallback(async () => {
    if (!effectiveSession || !content.trim()) {
      toast.error("Session and content are required");
      return;
    }
    try {
      const result = await submitFeedback({
        session_label: effectiveSession,
        team_id: teamId === "none" ? null : Number(teamId),
        author_id: camperId,
        category: category as any,
        content: content.trim(),
        points_to_award: POINTS_PER_FEEDBACK,
      });
      if (result?.success) {
        toast.success(`Feedback submitted! +${result.points_awarded} pts`);
        setContent("");
        onSuccess();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [effectiveSession, teamId, category, content, camperId, submitFeedback, onSuccess]);

  return (
    <Card className="p-5 border-amber-700/30 bg-amber-900/10">
      <h3 className="text-sm font-semibold text-foreground mb-3">Submit Feedback</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Session / Presentation</label>
          {sessions.length > 0 ? (
            <Select value={sessionLabel} onValueChange={setSessionLabel}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select session" /></SelectTrigger>
              <SelectContent>
                {sessions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                <SelectItem value="__new">+ New session...</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={newSession}
              onChange={(e) => setNewSession(e.target.value)}
              placeholder="e.g. Team Alpha Presentation"
              className="bg-muted/30"
            />
          )}
          {sessionLabel === "__new" && (
            <Input
              value={newSession}
              onChange={(e) => setNewSession(e.target.value)}
              placeholder="Session name..."
              className="bg-muted/30 mt-2"
            />
          )}
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Presenting Team (optional)</label>
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No specific team</SelectItem>
              {teams.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
                  category === cat.value ? cat.color + " font-semibold" : "bg-muted/30 text-muted-foreground border-border"
                }`}
              >
                <Icon icon={cat.icon as any} className="w-3 h-3" />
                {cat.label}
              </button>
            ))}
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Your Feedback</label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share what you observed..."
            className="bg-muted/30 min-h-[80px]"
          />
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={loading || !content.trim() || !effectiveSession} className="mt-3 bg-amber-600 hover:bg-amber-700">
        {loading ? "Submitting..." : `Submit (+${POINTS_PER_FEEDBACK} pts)`}
      </Button>
    </Card>
  );
}
