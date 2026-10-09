import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CamperAvatar from "@/components/CamperAvatar/index.js";

type AddCamperDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a cAMPer is added so the dashboard can refresh. */
  onAdded: () => void | Promise<void>;
};

function errorMessage(error: unknown): string {
  return error && typeof error === "object" && "message" in error
    ? String((error as { message: unknown }).message)
    : String(error);
}

/** Backup path: search this cohort's cAMPers and add one to the manager's dashboard. */
export default function AddCamperDialog({ open, onOpenChange, onAdded }: AddCamperDialogProps) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [addingId, setAddingId] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search 300ms
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(timerRef.current);
  }, [input]);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      setInput("");
      setSearch("");
    }
  }, [open]);

  const { data, loading, fetching, refetch } = useApiData(
    "GetAddableHires",
    { search: search || null },
    { enabled: open }
  );
  const { run: addHire } = useApi("AddHireToManager");

  const handleAdd = useCallback(
    async (camperId: number, name: string) => {
      setAddingId(camperId);
      try {
        await addHire({ camper_id: camperId });
        toast.success(`${name} added to your dashboard`);
        await Promise.all([refetch(), onAdded()]);
      } catch (error) {
        toast.error("Couldn't add cAMPer: " + errorMessage(error));
      } finally {
        setAddingId(null);
      }
    },
    [addHire, refetch, onAdded]
  );

  const campers = data?.campers ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a cAMPer</DialogTitle>
          <DialogDescription>
            Find a new hire who&apos;s registered for this cohort and add them to your dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Icon icon="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search by name or email"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className={`flex flex-col gap-2 max-h-80 overflow-y-auto ${fetching && !loading ? "opacity-70" : ""}`}>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading cAMPers…</p>
          ) : campers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-medium">
                {search ? `No cAMPers match "${search}"` : "No cAMPers to add"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your new hire hasn&apos;t registered yet — check back once they have.
              </p>
            </div>
          ) : (
            campers.map((c) => {
              const name = `${c.first_name} ${c.last_name}`;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <CamperAvatar email={c.email} photoUrl={c.photo_url} name={name} size="sm" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{name}</span>
                    <span className="text-xs text-muted-foreground truncate">{c.role}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleAdd(c.id, name)} disabled={addingId !== null}>
                    {addingId === c.id ? (
                      <Icon icon="loader-2" className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Icon icon="plus" className="w-3.5 h-3.5" />
                    )}
                    Add
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
