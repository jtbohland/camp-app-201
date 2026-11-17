import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Priority = "normal" | "important" | "urgent";
export type AnnouncementDraft = { title: string; body: string; priority: Priority; pinned: boolean };

type Props = {
  initial?: AnnouncementDraft;
  submitLabel: string;
  savingLabel: string;
  saving: boolean;
  onSubmit: (draft: AnnouncementDraft) => void;
  onCancel?: () => void;
};

/** Title, message, priority and pin. Used to post a new announcement and to edit one. */
export default function AnnouncementForm({ initial, submitLabel, savingLabel, saving, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "normal");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const ready = title.trim().length > 0 && body.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!ready) return;
    onSubmit({ title: title.trim(), body: body.trim(), priority, pinned });
  }, [ready, title, body, priority, pinned, onSubmit]);

  return (
    <Card className="p-3 border-amber-700/30 bg-amber-900/10">
      <div className="space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="bg-muted/30 h-8 text-xs" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your announcement..."
          className="bg-muted/30 min-h-[60px] text-xs"
        />
        <div className="flex items-center gap-2">
          <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
            <SelectTrigger className="w-28 h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setPinned(!pinned)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
              pinned ? "bg-amber-600/20 text-amber-400 border border-amber-600/40" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon icon="pin" className="w-2.5 h-2.5" />
            Pin
          </button>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={saving} size="sm" className="flex-1 text-xs h-7">
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={saving || !ready} size="sm" className="flex-1 bg-amber-600 hover:bg-amber-700 text-xs h-7">
            {saving ? savingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </Card>
  );
}
