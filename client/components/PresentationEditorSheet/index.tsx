import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useApi } from "@/hooks/useApi.js";
import { errorMessage } from "@/lib/cohortRefresh";
import { dayLabel, type ScheduleItem } from "@/lib/presentationSchedule";

type Props = {
  item: ScheduleItem | null;
  onClose: () => void;
  onSaved: () => void;
};

type Resource = { label?: string; url?: string };

const toResourcesText = (resources: unknown) =>
  (Array.isArray(resources) ? (resources as Resource[]) : [])
    .map((r) => `${r.label ?? ""}|${r.url ?? ""}`)
    .join("\n");

const parseResources = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [label, ...rest] = l.split("|");
      return { label: label.trim(), url: rest.join("|").trim() };
    })
    .filter((r) => r.url);

/** Side panel to edit a presentation's content. Day and order are set on the board. */
export default function PresentationEditorSheet({ item, onClose, onSaved }: Props) {
  const { run: update, loading } = useApi("UpdatePresentation");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [presentTime, setPresentTime] = useState("");
  const [deckUrl, setDeckUrl] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [resourcesText, setResourcesText] = useState("");

  useEffect(() => {
    if (!item) return;
    setTitle(item.title);
    setDescription(item.description ?? "");
    setInstructions(item.instructions ?? "");
    setPrepTime(item.prep_time_minutes != null ? String(item.prep_time_minutes) : "");
    setPresentTime(item.present_time_minutes != null ? String(item.present_time_minutes) : "");
    setDeckUrl(item.deck_template_url ?? "");
    setStatus(item.status);
    setResourcesText(toResourcesText(item.resources));
  }, [item]);

  const handleSave = useCallback(async () => {
    if (!item) return;
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    try {
      await update({
        id: item.id,
        title: title.trim(),
        description: description || null,
        instructions: instructions || null,
        resources: JSON.stringify(parseResources(resourcesText)),
        prep_time_minutes: prepTime ? Number(prepTime) : null,
        present_time_minutes: presentTime ? Number(presentTime) : null,
        deck_template_url: deckUrl || null,
        status: status as "upcoming" | "in_progress" | "completed",
      });
      toast.success("Presentation saved!");
      onSaved();
    } catch (e) {
      toast.error("Couldn't save: " + errorMessage(e));
    }
  }, [item, title, description, instructions, resourcesText, prepTime, presentTime, deckUrl, status, update, onSaved]);

  const field = "text-xs text-muted-foreground mb-1 block";

  return (
    <Sheet open={!!item} onOpenChange={(open) => !open && !loading && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Edit presentation</SheetTitle>
          <SheetDescription>
            {item?.day_number ? `Shows on ${dayLabel(item.day_number)}.` : "In the bank (hidden from cAMPers)."} Move it on the board.
          </SheetDescription>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={field}>Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={field}>Description (markdown supported)</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="font-mono text-xs" />
          </div>
          <div className="col-span-2">
            <label className={field}>Instructions (markdown supported)</label>
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={6} className="font-mono text-xs" />
          </div>
          <div>
            <label className={field}>Prep time (min)</label>
            <Input value={prepTime} onChange={(e) => setPrepTime(e.target.value)} type="number" min={0} />
          </div>
          <div>
            <label className={field}>Present time (min)</label>
            <Input value={presentTime} onChange={(e) => setPresentTime(e.target.value)} type="number" min={0} />
          </div>
          <div>
            <label className={field}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="upcoming">Upcoming</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className={field}>Deck template URL</label>
            <Input value={deckUrl} onChange={(e) => setDeckUrl(e.target.value)} placeholder="https://docs.google.com/..." />
          </div>
          <div className="col-span-2">
            <label className={field}>Resources (one per line: label|url)</label>
            <Textarea
              value={resourcesText}
              onChange={(e) => setResourcesText(e.target.value)}
              rows={3}
              placeholder="Slide Template|https://docs.google.com/presentation/..."
              className="font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={loading} className="bg-purple-600 text-white hover:bg-purple-700">
            {loading ? "Saving…" : "Save changes"}
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
