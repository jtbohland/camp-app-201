import { useState, useCallback, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Presentation = {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  resources: any;
  prep_time_minutes: number | null;
  present_time_minutes: number | null;
  day_number: number | null;
  status: string;
  sort_order: number;
  is_locked: boolean;
  deck_template_url: string | null;
};

export default function AdminPresentations() {
  const { data, refetch, fetching } = useApiData("GetPresentations", { status: null });
  const { run: createPres, loading: creating } = useApi("CreatePresentation");
  const { run: updatePres, loading: updating } = useApi("UpdatePresentation");

  const presentations = (data?.presentations ?? []) as Presentation[];
  const [editId, setEditId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const handleToggleLock = useCallback(async (p: Presentation) => {
    try {
      await updatePres({
        id: p.id,
        title: p.title,
        description: p.description,
        instructions: p.instructions,
        resources: JSON.stringify(p.resources ?? []),
        prep_time_minutes: p.prep_time_minutes,
        present_time_minutes: p.present_time_minutes,
        day_number: p.day_number,
        sort_order: p.sort_order,
        deck_template_url: p.deck_template_url,
        is_locked: !p.is_locked,
        status: p.status,
      });
      toast.success(p.is_locked ? `"${p.title}" unlocked` : `"${p.title}" locked`);
      refetch();
    } catch {
      toast.error("Failed to toggle lock");
    }
  }, [updatePres, refetch]);

  const handleCreate = useCallback(async () => {
    try {
      await createPres({
        title: "New Presentation",
        description: null,
        instructions: null,
        resources: null,
        prep_time_minutes: 30,
        present_time_minutes: 10,
        team_id: null,
        day_number: null,
        created_by: 0,
      });
      toast.success("Presentation created — edit it below");
      setShowCreate(false);
      refetch();
    } catch {
      toast.error("Failed to create");
    }
  }, [createPres, refetch]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Icon icon="presentation" className="w-5 h-5" />
            Presentations ({presentations.length})
          </h2>
          <p className="text-sm text-white/60">Create, edit content, and lock/unlock presentations</p>
        </div>
        <Button
          onClick={handleCreate}
          disabled={creating}
          className="bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          <Icon icon="plus" className="w-4 h-4 mr-1" />
          {creating ? "Creating..." : "New Presentation"}
        </Button>
      </div>

      {fetching && <p className="text-xs text-white/40">Updating...</p>}

      {/* Presentation list */}
      <div className="flex flex-col gap-3">
        {presentations.map((p) => (
          <div key={p.id} className="bg-white/10 backdrop-blur rounded-xl border border-white/10 overflow-hidden">
            {/* Summary row */}
            <div className="flex items-center gap-3 p-4">
              <button
                onClick={() => handleToggleLock(p)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  p.is_locked
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                }`}
                title={p.is_locked ? "Click to unlock" : "Click to lock"}
              >
                <Icon icon={p.is_locked ? "lock" : "lock-open"} className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{p.title}</p>
                <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                  {p.day_number && <span>Day {p.day_number}</span>}
                  {p.present_time_minutes && <span>{p.present_time_minutes}m present</span>}
                  <span className={p.status === "completed" ? "text-emerald-400" : p.status === "in_progress" ? "text-green-400" : "text-blue-400"}>
                    {p.status}
                  </span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditId(editId === p.id ? null : p.id)}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <Icon icon={editId === p.id ? "chevron-up" : "pencil"} className="w-4 h-4 mr-1" />
                {editId === p.id ? "Close" : "Edit"}
              </Button>
            </div>

            {/* Edit form */}
            {editId === p.id && (
              <PresentationEditor
                presentation={p}
                onSaved={() => { setEditId(null); refetch(); }}
              />
            )}
          </div>
        ))}

        {presentations.length === 0 && (
          <div className="bg-white/5 rounded-xl p-8 text-center">
            <Icon icon="presentation" className="w-10 h-10 mx-auto text-white/20 mb-3" />
            <p className="text-sm text-white/50">No presentations yet. Create one to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PresentationEditor({ presentation, onSaved }: { presentation: Presentation; onSaved: () => void }) {
  const { run: update, loading } = useApi("UpdatePresentation");

  const [title, setTitle] = useState(presentation.title);
  const [description, setDescription] = useState(presentation.description ?? "");
  const [instructions, setInstructions] = useState(presentation.instructions ?? "");
  const [prepTime, setPrepTime] = useState(String(presentation.prep_time_minutes ?? ""));
  const [presentTime, setPresentTime] = useState(String(presentation.present_time_minutes ?? ""));
  const [dayNumber, setDayNumber] = useState(String(presentation.day_number ?? ""));
  const [sortOrder, setSortOrder] = useState(String(presentation.sort_order ?? 0));
  const [deckUrl, setDeckUrl] = useState(presentation.deck_template_url ?? "");
  const [status, setStatus] = useState(presentation.status);

  // Resources as simple text list (label|url per line)
  const resourcesArray = Array.isArray(presentation.resources) ? presentation.resources : [];
  const [resourcesText, setResourcesText] = useState(
    resourcesArray.map((r: any) => `${r.label || ""}|${r.url || ""}`).join("\n")
  );

  const handleSave = useCallback(async () => {
    // Parse resources from text
    const resources = resourcesText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...urlParts] = line.split("|");
        return { label: label.trim(), url: urlParts.join("|").trim() };
      })
      .filter((r) => r.url);

    try {
      await update({
        id: presentation.id,
        title,
        description: description || null,
        instructions: instructions || null,
        resources: JSON.stringify(resources),
        prep_time_minutes: prepTime ? Number(prepTime) : null,
        present_time_minutes: presentTime ? Number(presentTime) : null,
        day_number: dayNumber ? Number(dayNumber) : null,
        sort_order: sortOrder ? Number(sortOrder) : 0,
        deck_template_url: deckUrl || null,
        is_locked: presentation.is_locked,
        status,
      });
      toast.success("Presentation saved!");
      onSaved();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Error: " + message);
    }
  }, [title, description, instructions, resourcesText, prepTime, presentTime, dayNumber, sortOrder, deckUrl, status, presentation, update, onSaved]);

  return (
    <div className="border-t border-white/10 p-4 bg-white/5 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs text-white/60 mb-1 block">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            className="bg-white/10 border-white/20 text-white" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/60 mb-1 block">Description (markdown supported)</label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={4} className="bg-white/10 border-white/20 text-white font-mono text-xs" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/60 mb-1 block">Instructions (markdown supported)</label>
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)}
            rows={6} className="bg-white/10 border-white/20 text-white font-mono text-xs" />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block">Prep Time (min)</label>
          <Input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} type="number"
            className="bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block">Present Time (min)</label>
          <Input value={presentTime} onChange={(e) => setPresentTime(e.target.value)} type="number"
            className="bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block">Day Number</label>
          <Input value={dayNumber} onChange={(e) => setDayNumber(e.target.value)} type="number"
            className="bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block">Sort Order</label>
          <Input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} type="number"
            className="bg-white/10 border-white/20 text-white" />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm">
            <option value="upcoming">Upcoming</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block">Deck Template URL</label>
          <Input value={deckUrl} onChange={(e) => setDeckUrl(e.target.value)}
            placeholder="https://docs.google.com/..."
            className="bg-white/10 border-white/20 text-white" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-white/60 mb-1 block">Resources (one per line: label|url)</label>
          <Textarea value={resourcesText} onChange={(e) => setResourcesText(e.target.value)}
            rows={3} placeholder="Slide Template|https://docs.google.com/presentation/..."
            className="bg-white/10 border-white/20 text-white font-mono text-xs" />
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
