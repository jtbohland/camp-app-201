import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";

type Props = {
  teamId: number;
  currentName: string;
  onSaved: () => void;
  onCancel: () => void;
};

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

/** Inline editor so a team can fix a typo in its name after the design is done. */
export default function TeamNameEditor({ teamId, currentName, onSaved, onCancel }: Props) {
  const [name, setName] = useState(currentName);
  const { run: renameTeam, loading } = useApi("RenameTeam");
  const trimmed = name.trim();
  const unchanged = trimmed === currentName.trim();

  const handleSave = useCallback(async () => {
    if (trimmed.length < 2 || unchanged) return;
    try {
      const res = await renameTeam({ team_id: teamId, name: trimmed });
      if (!res?.success) {
        toast.error(res?.message ?? "Could not rename team");
        return;
      }
      toast.success(`Team renamed to "${res.name}"`);
      onSaved();
    } catch (err) {
      toast.error("Could not rename team: " + errorText(err));
    }
  }, [trimmed, unchanged, renameTeam, teamId, onSaved]);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <input
          autoFocus
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") onCancel();
          }}
          className="flex-1 min-w-0 rounded-md border border-border bg-background px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="Team name"
        />
        <button
          onClick={handleSave}
          disabled={loading || trimmed.length < 2 || unchanged}
          className="p-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-40"
          title="Save name"
        >
          <Icon icon={loading ? "loader-circle" : "check"} className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <button onClick={onCancel} className="p-1.5 rounded-md border border-border hover:bg-muted" title="Cancel">
          <Icon icon="x" className="w-3.5 h-3.5" />
        </button>
      </div>
      <span className="text-[10px] text-muted-foreground">{name.length}/40 · Press Enter to save</span>
    </div>
  );
}
