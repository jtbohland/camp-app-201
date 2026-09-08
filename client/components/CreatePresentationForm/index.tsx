import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { toast } from "sonner";

type Props = {
  camperId: number;
  onCreated: () => void;
};

export default function CreatePresentationForm({ camperId, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("30");
  const [presentTime, setPresentTime] = useState("10");
  const [teamId, setTeamId] = useState<string>("");
  const [dayNumber, setDayNumber] = useState<string>("1");
  const [resourceLabel, setResourceLabel] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resources, setResources] = useState<{ label: string; url: string }[]>([]);

  const { run: create, loading } = useApi("CreatePresentation");
  const { data: teamsData } = useApiData("GetTeams", {});
  const teams = (teamsData?.teams ?? []) as any[];

  const addResource = useCallback(() => {
    if (!resourceUrl.trim()) return;
    setResources((prev) => [...prev, { label: resourceLabel.trim() || resourceUrl.trim(), url: resourceUrl.trim() }]);
    setResourceLabel("");
    setResourceUrl("");
  }, [resourceLabel, resourceUrl]);

  const removeResource = useCallback((idx: number) => {
    setResources((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      const result = await create({
        title: title.trim(),
        description: description.trim() || null,
        instructions: instructions.trim() || null,
        resources: resources.length > 0 ? JSON.stringify(resources) : null,
        prep_time_minutes: prepTime ? Number(prepTime) : null,
        present_time_minutes: presentTime ? Number(presentTime) : null,
        team_id: teamId ? Number(teamId) : null,
        day_number: dayNumber ? Number(dayNumber) : null,
        created_by: camperId,
      });
      if (result?.success) {
        toast.success("Presentation created!");
        onCreated();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [title, description, instructions, resources, prepTime, presentTime, teamId, dayNumber, camperId, create, onCreated]);

  return (
    <Card className="p-6 border-purple-400/20 bg-purple-400/5">
      <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Icon icon="plus-circle" className="w-4 h-4 text-purple-400" />
        New Presentation
      </h3>
      <div className="grid gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Team Value Prop Pitch" className="bg-muted/30" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Description</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this presentation about?" rows={2} className="bg-muted/30" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Instructions</label>
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Step-by-step instructions for the team..." rows={3} className="bg-muted/30" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Prep Time (min)</label>
            <Input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="bg-muted/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Present Time (min)</label>
            <Input type="number" value={presentTime} onChange={(e) => setPresentTime(e.target.value)} className="bg-muted/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Assigned Team</label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {teams.map((t: any) => (
                  <SelectItem key={t.id} value={t.id.toString()}>{t.team_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Day</label>
            <Select value={dayNumber} onValueChange={setDayNumber}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((d) => (
                  <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Resources */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Resources</label>
          {resources.length > 0 && (
            <div className="space-y-1 mb-2">
              {resources.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
                  <Icon icon="link" className="w-3 h-3 text-purple-400" />
                  <span className="flex-1 truncate">{r.label}</span>
                  <button onClick={() => removeResource(i)} className="text-muted-foreground hover:text-destructive">
                    <Icon icon="x" className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Input value={resourceLabel} onChange={(e) => setResourceLabel(e.target.value)} placeholder="Label" className="bg-muted/30 flex-1" />
            <Input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="URL" className="bg-muted/30 flex-[2]" />
            <Button type="button" variant="outline" size="sm" onClick={addResource} disabled={!resourceUrl.trim()}>
              <Icon icon="plus" className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading || !title.trim()} className="bg-purple-600 hover:bg-purple-700">
          {loading ? "Creating..." : "Create Presentation"}
        </Button>
      </div>
    </Card>
  );
}
