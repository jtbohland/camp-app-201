import { useState, useCallback, useRef } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type TableStatus = {
  table_name: string;
  source_count: number;
  dest_count: number;
  synced: boolean;
  wave: number;
};

type MigrationResult = {
  table_name: string;
  status: "pending" | "running" | "success" | "error";
  rows_copied: number;
  error: string | null;
};

const WAVE_LABELS: Record<number, string> = {
  0: "Root Tables (no dependencies)",
  1: "Core Tables (cohorts, badges, teams)",
  2: "Campers",
  3: "Child Tables (depends on campers/teams)",
};

export default function DataMigration() {
  const user = useSuperblocksUser();
  const { data, loading, refetch } = useApiData("GetMigrationStatus", {});
  const { run: migrateTable } = useApi("MigrateTable");
  const [results, setResults] = useState<Record<string, MigrationResult>>({});
  const [migrating, setMigrating] = useState(false);
  const abortRef = useRef(false);

  // Admin check — only counselors can access
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Icon icon="shield-alert" className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">This page is restricted to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading migration status...</div>
      </div>
    );
  }

  const tables = data?.tables ?? [];
  const totalSource = data?.total_source ?? 0;
  const totalDest = data?.total_dest ?? 0;
  const allSynced = data?.all_synced ?? false;

  // Group by wave
  const waves = new Map<number, TableStatus[]>();
  for (const t of tables) {
    if (!waves.has(t.wave)) waves.set(t.wave, []);
    waves.get(t.wave)!.push(t);
  }

  const migrateOne = useCallback(async (tableName: string) => {
    setResults(prev => ({
      ...prev,
      [tableName]: { table_name: tableName, status: "running", rows_copied: 0, error: null },
    }));

    try {
      const result = await migrateTable({ table_name: tableName });
      const r = result as { success: boolean; rows_copied: number; error: string | null };
      setResults(prev => ({
        ...prev,
        [tableName]: {
          table_name: tableName,
          status: r.success ? "success" : "error",
          rows_copied: r.rows_copied,
          error: r.error,
        },
      }));
      return r.success;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message :
        (typeof err === "object" && err !== null && "message" in err)
          ? String((err as { message: unknown }).message)
          : String(err);
      setResults(prev => ({
        ...prev,
        [tableName]: { table_name: tableName, status: "error", rows_copied: 0, error: message },
      }));
      return false;
    }
  }, [migrateTable]);

  const migrateAll = useCallback(async () => {
    setMigrating(true);
    abortRef.current = false;
    setResults({});

    // Process in wave order
    const sortedWaves = [...waves.keys()].sort((a, b) => a - b);
    let successCount = 0;
    let errorCount = 0;

    for (const waveNum of sortedWaves) {
      const waveTables = waves.get(waveNum) ?? [];
      for (const t of waveTables) {
        if (abortRef.current) {
          toast.info("Migration stopped by user");
          setMigrating(false);
          return;
        }
        if (t.source_count === 0) {
          setResults(prev => ({
            ...prev,
            [t.table_name]: { table_name: t.table_name, status: "success", rows_copied: 0, error: null },
          }));
          successCount++;
          continue;
        }
        const ok = await migrateOne(t.table_name);
        if (ok) successCount++;
        else errorCount++;
      }
    }

    await refetch();
    setMigrating(false);

    if (errorCount === 0) {
      toast.success(`Migration complete! ${successCount} tables synced.`);
    } else {
      toast.error(`Migration finished with ${errorCount} error(s). Check details below.`);
    }
  }, [waves, migrateOne, refetch]);

  const stopMigration = useCallback(() => {
    abortRef.current = true;
  }, []);

  const completedCount = Object.values(results).filter(r => r.status === "success").length;
  const errorCount = Object.values(results).filter(r => r.status === "error").length;
  const runningTable = Object.values(results).find(r => r.status === "running")?.table_name;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-4xl mx-auto overflow-auto h-full">
      <div className="flex items-center gap-3">
        <Icon icon="database" className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Data Migration</h1>
          <p className="text-sm text-muted-foreground">
            Copy data from shared Apps Database → dedicated App Database
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <Card className={allSynced ? "border-green-500 bg-green-50" : "border-amber-500 bg-amber-50"}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon icon={allSynced ? "check-circle" : "alert-triangle"}
              className={allSynced ? "text-green-600 w-5 h-5" : "text-amber-600 w-5 h-5"} />
            <div>
              <span className="font-semibold">
                {allSynced ? "All tables synced!" : "Tables need migration"}
              </span>
              <span className="text-sm text-muted-foreground ml-3">
                Source: {totalSource} rows · Dest: {totalDest} rows · {tables.length} tables
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {migrating ? (
              <Button variant="destructive" size="sm" onClick={stopMigration}>
                <Icon icon="square" className="w-4 h-4 mr-1" /> Stop
              </Button>
            ) : (
              <Button onClick={migrateAll} disabled={allSynced}>
                <Icon icon="play" className="w-4 h-4 mr-1" />
                {allSynced ? "All Synced" : "Migrate All"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={migrating}>
              <Icon icon="refresh-cw" className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress bar */}
      {migrating && (
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Migrating: {runningTable ?? "..."}</span>
            <span>{completedCount + errorCount} / {tables.length}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((completedCount + errorCount) / Math.max(tables.length, 1)) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Tables grouped by wave */}
      {[...waves.entries()].sort(([a], [b]) => a - b).map(([waveNum, waveTables]) => (
        <Card key={waveNum}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wave {waveNum}: {WAVE_LABELS[waveNum] ?? "Other"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-2 font-medium">Table</th>
                  <th className="text-right px-4 py-2 font-medium w-24">Source</th>
                  <th className="text-right px-4 py-2 font-medium w-24">Dest</th>
                  <th className="text-center px-4 py-2 font-medium w-24">Status</th>
                  <th className="text-right px-4 py-2 font-medium w-32">Action</th>
                </tr>
              </thead>
              <tbody>
                {waveTables.map(t => {
                  const r = results[t.table_name];
                  const isSynced = r?.status === "success" || t.synced;
                  const isRunning = r?.status === "running";
                  const isError = r?.status === "error";
                  return (
                    <tr key={t.table_name} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">
                        {t.table_name.replace("camp201_", "")}
                        {isError && (
                          <div className="text-destructive text-xs mt-0.5">{r.error}</div>
                        )}
                      </td>
                      <td className="text-right px-4 py-2 tabular-nums">{t.source_count}</td>
                      <td className="text-right px-4 py-2 tabular-nums">
                        {r?.status === "success" ? r.rows_copied : t.dest_count}
                      </td>
                      <td className="text-center px-4 py-2">
                        {isRunning ? (
                          <Icon icon="loader" className="w-4 h-4 animate-spin text-primary mx-auto" />
                        ) : isError ? (
                          <Icon icon="x-circle" className="w-4 h-4 text-destructive mx-auto" />
                        ) : isSynced ? (
                          <Icon icon="check-circle" className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <Icon icon="minus-circle" className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                      <td className="text-right px-4 py-2">
                        <Button size="sm" variant="ghost"
                          disabled={migrating || isRunning}
                          onClick={() => migrateOne(t.table_name).then(() => refetch())}>
                          {isRunning ? "..." : "Migrate"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}

      {/* Results summary */}
      {(completedCount > 0 || errorCount > 0) && !migrating && (
        <Card className="border-muted">
          <CardContent className="p-4 text-sm">
            <strong>Last run:</strong> {completedCount} succeeded, {errorCount} failed
            {errorCount > 0 && (
              <span className="text-destructive"> — scroll up to see error details</span>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
