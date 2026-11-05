import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import CamperAvatar from "@/components/CamperAvatar/index.js";
import { getRoleGroup, mapToStandardRole } from "@/lib/roles.js";

/** "AE – Strategic" stays specific here; falls back to the stored title. */
const getRoleShort = (role: string | null) => mapToStandardRole(role) ?? getRoleGroup(role) ?? role ?? "";
import type { IconName } from "lucide-react/dynamic";

const PAGE_SIZE = 20;

/**
 * What counselors see instead of their own graduation card: everyone ranked, with
 * badges and teams. Counselors aren't ranked and don't earn badges themselves.
 */
export default function CounselorCampSnapshot() {
  const { data, loading, fetching, isError, error, refetch } = useApiData("GetCampSnapshot", {}, { staleTime: 15_000 });
  const [page, setPage] = useState(0);
  const campers = data?.campers ?? [];
  const teams = data?.teams ?? [];
  const totalPages = Math.max(1, Math.ceil(campers.length / PAGE_SIZE));
  const pageRows = useMemo(() => campers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [campers, page]);
  const camperById = useMemo(() => new Map(campers.map((c) => [c.id, c])), [campers]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-destructive">Couldn't load the camp snapshot: {error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "unknown error"}</p>
        <button onClick={() => refetch()} className="mt-3 text-sm font-medium text-primary hover:underline">Try again</button>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${fetching ? "opacity-70" : ""}`}>
      {/* Header */}
      <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-green-50 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Counselor view</p>
            <h2 className="text-2xl font-extrabold text-foreground">Full-camp snapshot</h2>
            <p className="text-sm text-muted-foreground">Every cAMPer, ranked. Counselors aren't ranked and don't earn badges.</p>
          </div>
          <div className="flex gap-6 text-center">
            <Stat value={campers.length} label="cAMPers" color="text-foreground" />
            <Stat value={teams.length} label="Teams" color="text-camp-green" />
            <Stat value={data?.total_points ?? 0} label="Total pts" color="text-amber-600" />
            <Stat value={data?.total_badges ?? 0} label="Badges" color="text-purple-600" />
          </div>
        </div>
        {fetching && <p className="mt-2 text-xs text-muted-foreground">Updating…</p>}
      </div>

      {/* Ranked list */}
      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Icon icon="trophy" className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-foreground">Leaderboard</h3>
        </div>
        {campers.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No cAMPers in this cohort yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {pageRows.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3">
                <span className={`w-8 text-center text-sm font-extrabold ${c.rank <= 3 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {c.rank === 1 ? "👑" : `#${c.rank}`}
                </span>
                <CamperAvatar email="" name={c.name} photoUrl={c.photo_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {[getRoleShort(c.role), c.region].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {c.team_name && (
                  <span
                    className="hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white sm:inline-block"
                    style={{ backgroundColor: c.team_color || "#4a7c59" }}
                  >
                    {c.team_name}
                  </span>
                )}
                <div className="hidden max-w-[220px] shrink-0 flex-wrap justify-end gap-1 md:flex">
                  {c.badges.slice(0, 6).map((b) => (
                    <span key={b.id} title={`${b.name}${b.count > 1 ? ` ×${b.count}` : ""}`} className={`flex h-6 w-6 items-center justify-center rounded-md bg-${b.color}-100`}>
                      <Icon icon={b.icon as IconName} className={`h-3.5 w-3.5 text-${b.color}-600`} />
                    </span>
                  ))}
                  {c.badges.length > 6 && <span className="text-[10px] text-muted-foreground">+{c.badges.length - 6}</span>}
                </div>
                <span className="w-14 shrink-0 text-right text-sm font-bold text-amber-600">{c.points}</span>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-2 text-xs text-muted-foreground">
            <span>Page {page + 1} of {totalPages} ({campers.length} cAMPers)</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Previous</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} className="rounded border border-border px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </Card>

      {/* Team tiles */}
      {teams.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon icon="flag" className="h-4 w-4 text-camp-green" />
            Teams
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {teams.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="mb-3 flex items-center gap-3">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt={t.name} className="h-11 w-11 rounded-lg border-2 object-cover" style={{ borderColor: t.color || "#ccc" }} />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ backgroundColor: t.color || "#4a7c59" }}>
                      {t.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">#{t.rank} · {t.total_points} pts</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {t.member_ids.map((id) => {
                    const m = camperById.get(id);
                    if (!m) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
                        <CamperAvatar email="" name={m.name} photoUrl={m.photo_url} size="sm" className="!h-5 !w-5" />
                        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{m.name}</span>
                        <span className="text-[10px] font-semibold text-muted-foreground">{m.points}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}
