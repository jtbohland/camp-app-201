import { useState, useCallback, useRef } from "react";
import { useDraggable, useDroppable, useDndMonitor } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import BlackoutSettings, { sameBlackout, type BlackoutValue } from "@/components/BlackoutSettings/index.js";
import { blackoutAudienceLabel } from "@/lib/blackouts.js";

const BANK_COLORS: Record<string, string> = {
  core: "border-l-emerald-400",
  challenger: "border-l-blue-400",
  workshop: "border-l-purple-400",
  value: "border-l-teal-400",
  presentation: "border-l-amber-400",
  executive: "border-l-yellow-400",
  social: "border-l-pink-400",
  break: "border-l-gray-300",
  session: "border-l-emerald-400",
  lunch: "border-l-orange-400",
};

export type BankSession = {
  id: number;
  title: string;
  description: string | null;
  duration_minutes: number;
  session_type: string;
  created_by: string | null;
  is_blackout?: boolean;
  blackout_roles?: string[];
};

type Props = {
  sessions: BankSession[];
  onSessionCreated: () => void;
  /** True while a scheduled agenda item is being dragged; shows the "drop to remove" zone. */
  showRemoveTarget?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  core: "Core",
  challenger: "Challenger",
  workshop: "Workshops",
  value: "Value-Based",
  presentation: "Presentations",
  executive: "Executive",
  social: "Social",
  session: "Other",
  break: "Breaks",
};

const TYPE_ORDER = ["core", "challenger", "workshop", "value", "presentation", "executive", "social", "session", "break"];

function DraggableBankItem({ session, onEdit, onRemove, recentlyDragged }: { session: BankSession; onEdit: (s: BankSession) => void; onRemove: (id: number) => void; recentlyDragged: () => boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `bank-${session.id}`,
    data: { session },
  });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 };
  const dur = session.duration_minutes >= 60 ? `${session.duration_minutes / 60}h` : `${session.duration_minutes}m`;

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-1 p-2 rounded-lg border border-l-[3px] ${BANK_COLORS[session.session_type] ?? "border-l-gray-300"} bg-card hover:border-camp-green/40 transition-colors group`}>
      <div
        {...attributes}
        {...listeners}
        onClick={() => {
          if (!recentlyDragged()) onEdit(session);
        }}
        title={session.is_blackout ? `Required (blackout): ${blackoutAudienceLabel(session.blackout_roles ?? [], 20)} · Click to edit, drag to schedule` : "Click to edit, drag to schedule"}
        className="flex-1 flex items-center gap-2 cursor-grab active:cursor-grabbing min-w-0"
      >
        <Icon
          icon={session.is_blackout ? "shield-alert" : session.session_type === "executive" ? "star" : session.session_type === "break" ? "coffee" : "presentation"}
          className={`w-3 h-3 flex-shrink-0 ${session.is_blackout ? "text-red-600" : "text-muted-foreground"}`}
        />
        <div className="min-w-0">
          <p className="text-xs font-medium leading-tight">{session.title}</p>
          {session.is_blackout && (
            <p className="truncate text-[9px] font-semibold text-red-600">Required · {blackoutAudienceLabel(session.blackout_roles ?? [], 1)}</p>
          )}
        </div>
      </div>
      <Badge variant="secondary" className="text-[10px] px-1 py-0 flex-shrink-0">{dur}</Badge>
      <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex">
        <button onClick={() => onEdit(session)} className="p-0.5 hover:text-camp-green" title="Edit"><Icon icon="pencil" className="w-3 h-3" /></button>
        <button onClick={() => onRemove(session.id)} className="p-0.5 hover:text-red-500" title="Remove"><Icon icon="x" className="w-3 h-3" /></button>
      </div>
    </div>
  );
}

export default function SessionBankPanel({ sessions, onSessionCreated, showRemoveTarget = false }: Props) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: "session-bank" });
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState<BankSession | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [sessionType, setSessionType] = useState("session");
  const [blackout, setBlackout] = useState<BlackoutValue>({ isBlackout: false, roles: [] });
  const [filter, setFilter] = useState("");

  const { run: createSession, loading: creating } = useApi("CreateBankSession");
  const { run: updateSession, loading: updating } = useApi("UpdateBankSession");
  const { run: removeSession } = useApi("RemoveBankSession");
  const { run: saveBlackout, loading: savingBlackout } = useApi("SetBlackout");

  // Some browsers fire a click right after a drag ends; don't open the editor for it.
  const lastDragEndRef = useRef(0);
  useDndMonitor({
    onDragEnd: () => { lastDragEndRef.current = Date.now(); },
    onDragCancel: () => { lastDragEndRef.current = Date.now(); },
  });
  const recentlyDragged = useCallback(() => Date.now() - lastDragEndRef.current < 300, []);

  const openCreate = useCallback(() => {
    setEditSession(null);
    setTitle(""); setDescription(""); setDuration("60"); setSessionType("session");
    setBlackout({ isBlackout: false, roles: [] });
    setShowForm(true);
  }, []);

  const openEdit = useCallback((s: BankSession) => {
    setEditSession(s);
    setTitle(s.title);
    setDescription(s.description ?? "");
    setDuration(String(s.duration_minutes));
    setSessionType(s.session_type);
    setBlackout({ isBlackout: !!s.is_blackout, roles: s.blackout_roles ?? [] });
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    try {
      let sessionId: number;
      let blackoutChanged: boolean;
      if (editSession) {
        await updateSession({ id: editSession.id, title: title.trim(), description: description.trim() || null, duration_minutes: parseInt(duration, 10), session_type: sessionType });
        sessionId = editSession.id;
        blackoutChanged = !sameBlackout({ isBlackout: !!editSession.is_blackout, roles: editSession.blackout_roles ?? [] }, blackout);
      } else {
        const created = await createSession({ title: title.trim(), description: description.trim() || null, duration_minutes: parseInt(duration, 10), session_type: sessionType, created_by: null });
        sessionId = created?.id ?? 0;
        blackoutChanged = blackout.isBlackout;
      }
      if (blackoutChanged && sessionId > 0) {
        const r = await saveBlackout({ target: "bank", id: sessionId, is_blackout: blackout.isBlackout, roles: blackout.roles });
        const tiles = r?.tiles_updated ?? 0;
        const scheduled = tiles > 0 ? ` (${tiles} scheduled tile${tiles === 1 ? "" : "s"} updated)` : "";
        toast.success(blackout.isBlackout ? `"${title.trim()}" is now required${scheduled}` : `"${title.trim()}" is no longer required${scheduled}`);
        const conflicts = r?.open_conflicts ?? 0;
        if (blackout.isBlackout && conflicts > 0) {
          toast.warning(`${conflicts} approved absence${conflicts === 1 ? "" : "s"} now overlap a required session. Those cAMPers will be asked to reschedule.`);
        }
      } else {
        toast.success(editSession ? "Session updated" : "Session added");
      }
      setShowForm(false); setEditSession(null);
      onSessionCreated();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Failed: " + msg);
    }
  }, [title, description, duration, sessionType, blackout, editSession, createSession, updateSession, saveBlackout, onSessionCreated]);

  const handleRemove = useCallback(async (id: number) => {
    try {
      await removeSession({ id });
      toast.success("Removed from bank");
      onSessionCreated();
    } catch {
      toast.error("Failed to remove");
    }
  }, [removeSession, onSessionCreated]);

  const filtered = filter ? sessions.filter((s) => s.title.toLowerCase().includes(filter.toLowerCase())) : sessions;
  const grouped = TYPE_ORDER.filter((t) => filtered.some((s) => s.session_type === t)).map((t) => ({
    type: t,
    label: TYPE_LABELS[t] ?? t,
    items: filtered.filter((s) => s.session_type === t),
  }));

  return (
    <div ref={setDropRef} className="relative flex flex-col h-full">
      {showRemoveTarget && (
        <div
          className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center transition-colors ${
            isOver ? "border-destructive bg-destructive/10 text-destructive" : "border-border bg-card/95 text-muted-foreground"
          }`}
        >
          <Icon icon="undo-2" className="w-6 h-6" />
          <p className="text-xs font-medium">Drop here to remove from agenda</p>
          <p className="text-[10px]">It stays in the Session Bank</p>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Icon icon="library" className="w-4 h-4 text-camp-green" />
          Session Bank
        </h3>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => showForm ? setShowForm(false) : openCreate()}>
          <Icon icon={showForm ? "x" : "plus"} className="w-4 h-4" />
        </Button>
      </div>

      {showForm && (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 border mb-2 max-h-[65%] shrink-0 overflow-y-auto">
          <Input placeholder="Session title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-7 text-xs" />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="h-7 text-xs" />
          <div className="flex gap-2">
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45 min</SelectItem>
                <SelectItem value="60">1 hr</SelectItem>
                <SelectItem value="75">1.25 hr</SelectItem>
                <SelectItem value="90">1.5 hr</SelectItem>
                <SelectItem value="120">2 hr</SelectItem>
                <SelectItem value="150">2.5 hr</SelectItem>
                <SelectItem value="180">3 hr</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sessionType} onValueChange={setSessionType}>
              <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPE_ORDER.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <BlackoutSettings
            compact
            value={blackout}
            onChange={setBlackout}
            hint="Applies to this session and every tile scheduled from it."
          />
          <Button size="sm" onClick={handleSave} disabled={creating || updating || savingBlackout || !title.trim()} className="h-7 text-xs">
            {editSession ? (updating || savingBlackout ? "Saving..." : "Save Changes") : (creating || savingBlackout ? "Adding..." : "Add to Bank")}
          </Button>
        </div>
      )}

      <Input placeholder="Search sessions..." value={filter} onChange={(e) => setFilter(e.target.value)} className="h-7 text-xs mb-2" />

      <div className="flex-1 overflow-auto space-y-2.5">
        {grouped.map((g) => (
          <div key={g.type}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">{g.label} ({g.items.length})</p>
            <div className="space-y-1">
              {g.items.map((s) => <DraggableBankItem key={s.id} session={s} onEdit={openEdit} onRemove={handleRemove} recentlyDragged={recentlyDragged} />)}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-4 text-xs text-muted-foreground">
            <Icon icon="package-open" className="w-6 h-6 mx-auto mb-1 opacity-50" />
            <p>{filter ? "No matching sessions" : "No sessions yet"}</p>
          </div>
        )}
      </div>

      <div className="mt-2 pt-2 border-t">
        <p className="text-[10px] text-muted-foreground text-center">Drag onto the schedule · Click to edit or mark required</p>
      </div>
    </div>
  );
}
