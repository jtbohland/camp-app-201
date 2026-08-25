import { useState, useCallback } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";

export type BankSession = {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  session_type: string;
  created_by: string | null;
};

type SessionBankPanelProps = {
  sessions: BankSession[];
  onSessionCreated: () => void;
};

function DraggableBankItem({ session }: { session: BankSession }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bank-${session.id}`,
    data: { session },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const durationLabel =
    session.duration_minutes >= 60
      ? `${session.duration_minutes / 60}h`
      : `${session.duration_minutes}m`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card hover:border-camp-green/40 cursor-grab active:cursor-grabbing transition-colors"
    >
      <div className="flex-shrink-0">
        <Icon
          icon={session.session_type === "break" ? "coffee" : "presentation"}
          className="w-3.5 h-3.5 text-muted-foreground"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{session.title}</p>
      </div>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex-shrink-0">
        {durationLabel}
      </Badge>
    </div>
  );
}

export default function SessionBankPanel({ sessions, onSessionCreated }: SessionBankPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [sessionType, setSessionType] = useState("session");

  const { run: createSession, loading: creating } = useApi("CreateBankSession");

  const handleCreate = useCallback(async () => {
    if (!title.trim()) return;
    try {
      await createSession({
        title: title.trim(),
        description: description.trim() || null,
        duration_minutes: parseInt(duration, 10),
        session_type: sessionType,
        created_by: null,
      });
      toast.success("Session added to bank");
      setTitle("");
      setDescription("");
      setDuration("60");
      setSessionType("session");
      setShowForm(false);
      onSessionCreated();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Failed to create session: " + message);
    }
  }, [title, description, duration, sessionType, createSession, onSessionCreated]);

  const sessionItems = sessions.filter((s) => s.session_type === "session");
  const breakItems = sessions.filter((s) => s.session_type === "break");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Icon icon="library" className="w-4 h-4 text-camp-green" />
          Session Bank
        </h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={() => setShowForm(!showForm)}
        >
          <Icon icon={showForm ? "x" : "plus"} className="w-4 h-4" />
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 border border-border mb-3">
          <Input
            placeholder="Session title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-8 text-xs"
          />
          <div className="flex gap-2">
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="90">1.5 hours</SelectItem>
                <SelectItem value="5">5 min break</SelectItem>
                <SelectItem value="10">10 min break</SelectItem>
                <SelectItem value="15">15 min break</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="session">Session</SelectItem>
                <SelectItem value="break">Break</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleCreate} disabled={creating || !title.trim()} className="h-8 text-xs">
            {creating ? "Adding..." : "Add to Bank"}
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-auto space-y-3">
        {sessionItems.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
              Sessions
            </p>
            <div className="space-y-1.5">
              {sessionItems.map((s) => (
                <DraggableBankItem key={s.id} session={s} />
              ))}
            </div>
          </div>
        )}

        {breakItems.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">
              Breaks
            </p>
            <div className="space-y-1.5">
              {breakItems.map((s) => (
                <DraggableBankItem key={s.id} session={s} />
              ))}
            </div>
          </div>
        )}

        {sessions.length === 0 && (
          <div className="text-center py-6 text-xs text-muted-foreground">
            <Icon icon="package-open" className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No sessions yet</p>
            <p className="mt-1">Click + to add sessions to the bank</p>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Drag sessions onto the schedule
        </p>
      </div>
    </div>
  );
}
