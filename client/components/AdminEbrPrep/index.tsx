import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import EbrRoleCard, { type EbrRole } from "./EbrRoleCard.js";

type Filter = "mine" | "all";

const roleKey = (r: Pick<EbrRole, "presentation_id" | "team_id" | "counselor_id">) => `${r.presentation_id}:${r.team_id}:${r.counselor_id}`;

function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Request failed";
}

/** Counselor Hub: every counselor's Mini EBR role, with AI prep scripts per role. */
export default function AdminEbrPrep({ canEdit }: { canEdit: boolean }) {
  const { data, loading, fetching, isError, error, refetch } = useApiData("GetEbrCounselorRoles", {}, { refetchOnWindowFocus: true });
  const { run: generate } = useApi("GenerateEbrScript");
  const [filter, setFilter] = useState<Filter>("mine");
  const [generating, setGenerating] = useState<Set<string>>(new Set());

  const roles = (data?.roles ?? []) as EbrRole[];
  const myId = data?.my_counselor_id ?? null;
  const mine = roles.filter((r) => r.counselor_id === myId);
  const shown = filter === "mine" && mine.length > 0 ? mine : roles;

  // Group by presentation, then by team (in meeting order: one EBR per team).
  const groups = useMemo(() => {
    const byKey = new Map<string, { title: string; team: string; roles: EbrRole[] }>();
    for (const r of shown) {
      const k = `${r.presentation_id}:${r.team_id}`;
      const g = byKey.get(k) ?? { title: r.presentation_title || "Mini EBR", team: r.team_name, roles: [] };
      g.roles.push(r);
      byKey.set(k, g);
    }
    return [...byKey.entries()];
  }, [shown]);

  const handleGenerate = useCallback(async (r: EbrRole) => {
    const k = roleKey(r);
    setGenerating((s) => new Set(s).add(k));
    try {
      await generate({ presentation_id: r.presentation_id, team_id: r.team_id, counselor_id: r.counselor_id });
      await refetch();
      toast.success(`Script ready: ${r.executive_role} for ${r.team_name}`);
    } catch (err) {
      toast.error("Couldn't write the script: " + errorMessage(err));
    } finally {
      setGenerating((s) => { const n = new Set(s); n.delete(k); return n; });
    }
  }, [generate, refetch]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return <Card className="p-6 text-sm text-red-600">Couldn't load EBR roles: {errorMessage(error)}</Card>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Card className="flex flex-wrap items-start gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <Icon icon="theater" className="h-5 w-5 text-amber-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-foreground">Mini EBR role prep</h2>
          <p className="text-sm text-muted-foreground">
            Each team assigns you an executive role for their EBR. Generate a prep script for any role: a quick brief on who you are
            and who you're meeting, plus questions in meeting order to draw on during the 30 minutes.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
          {(["mine", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "mine" ? `My roles (${mine.length})` : `All counselors (${roles.length})`}
            </button>
          ))}
        </div>
      </Card>

      {fetching && <p className="text-xs text-muted-foreground">Updating…</p>}
      {filter === "mine" && mine.length === 0 && roles.length > 0 && (
        <p className="text-xs text-muted-foreground">No teams have assigned you a role yet, so all counselors are shown.</p>
      )}

      {roles.length === 0 ? (
        <Card className="p-8 text-center">
          <Icon icon="theater" className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-2 text-sm font-medium text-foreground">No EBR roles assigned yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Teams assign counselor roles in their Team Hub, under the Mini EBR session's Role play tab.
          </p>
        </Card>
      ) : (
        <div className={`space-y-6 ${fetching ? "opacity-70" : ""}`}>
          {groups.map(([k, g]) => (
            <section key={k} className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                <Icon icon="presentation" className="h-4 w-4" /> {g.team} · {g.title}
              </h3>
              {g.roles.map((r) => (
                <EbrRoleCard
                  key={roleKey(r)}
                  role={r}
                  isMine={r.counselor_id === myId}
                  generating={generating.has(roleKey(r))}
                  canGenerate={canEdit}
                  onGenerate={() => handleGenerate(r)}
                />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
