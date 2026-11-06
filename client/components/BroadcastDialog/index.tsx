import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import { errorMessage } from "@/lib/cohortRefresh";
import { SENTIMENTS, refreshThreadViews, type Visibility } from "@/lib/managerThreads";

type Hire = { id: number; first_name: string; last_name: string };
type Sentiment = "positive" | "encouraging" | "feedback" | "concerning";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hires: Hire[];
};

/** "Message all my cAMPers": one note, sent as a separate conversation to each selected hire. */
export default function BroadcastDialog({ open, onOpenChange, hires }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [content, setContent] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("encouraging");
  const [audience, setAudience] = useState<Visibility>("camper");
  const { run: send, loading } = useApi("SendManagerBroadcast");

  // Everyone selected each time the dialog opens
  useEffect(() => {
    if (open) setSelected(new Set(hires.map((h) => h.id)));
  }, [open, hires]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSend = useCallback(async () => {
    try {
      const res = await send({ camper_ids: [...selected], sentiment, content: content.trim(), visibility: audience });
      await refreshThreadViews();
      toast.success(
        audience === "camper"
          ? `Sent to ${res?.sent ?? selected.size} cAMPer${(res?.sent ?? selected.size) === 1 ? "" : "s"}`
          : `Counselor note added for ${res?.sent ?? selected.size} cAMPer${(res?.sent ?? selected.size) === 1 ? "" : "s"}`,
      );
      setContent("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Couldn't send: " + errorMessage(error));
    }
  }, [send, selected, sentiment, content, audience, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Message my cAMPers</DialogTitle>
          <DialogDescription>
            Each cAMPer gets their own copy, and their replies come back to you one by one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="inline-flex rounded-lg border border-border p-0.5">
            {(["camper", "counselor"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAudience(v)}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
                  audience === v ? (v === "camper" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800") : "text-muted-foreground"
                }`}
              >
                <Icon icon={v === "camper" ? "eye" : "lock"} className="h-3.5 w-3.5" />
                {v === "camper" ? "Share with cAMPers" : "Counselors only"}
              </button>
            ))}
          </div>

          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
            <button
              type="button"
              className="mb-1 text-[11px] font-medium text-primary hover:underline"
              onClick={() => setSelected(selected.size === hires.length ? new Set() : new Set(hires.map((h) => h.id)))}
            >
              {selected.size === hires.length ? "Clear all" : "Select all"}
            </button>
            {hires.map((h) => (
              <label key={h.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted/50">
                <Checkbox checked={selected.has(h.id)} onCheckedChange={() => toggle(h.id)} />
                {h.first_name} {h.last_name}
              </label>
            ))}
          </div>

          <Select value={sentiment} onValueChange={(v) => setSentiment(v as Sentiment)}>
            <SelectTrigger className="h-8 w-44 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SENTIMENTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  <span className="flex items-center gap-1.5"><Icon icon={s.icon} className={`h-3.5 w-3.5 ${s.color}`} />{s.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={audience === "camper" ? "Great first day, everyone! Proud of you all…" : "Context for the counselors about my group…"}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={loading || selected.size === 0 || !content.trim()}>
            {loading ? "Sending…" : `Send to ${selected.size}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
