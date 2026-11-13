import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type RegisteredManager = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  title: string;
  region: string;
  hire_count: number;
  comment_count: number;
  last_viewed_at: string | null;
  /** Names of the cAMPers this manager claimed. */
  hires: string[];
};

/** Registered managers: who they are, which cAMPers they claimed, comments, and last visit. */
export default function RegisteredManagersTable({ managers }: { managers: RegisteredManager[] }) {
  return (
    <Card className="bg-card border-border">
      <div className="border-b border-border p-4">
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <Icon icon="binoculars" className="h-4 w-4" />
          Registered Managers
          <Badge className="border-border bg-muted text-xs text-foreground/80">{managers.length}</Badge>
        </h3>
      </div>
      {managers.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">No managers have registered yet</div>
      ) : (
        <div className="max-h-[36rem] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[32%]">Manager</TableHead>
                <TableHead>cAMPers claimed</TableHead>
                <TableHead className="w-28 text-center">Comments</TableHead>
                <TableHead className="w-32">Last viewed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {managers.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                        {(m.first_name[0] ?? "").toUpperCase()}
                        {(m.last_name[0] ?? "").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">
                          {m.first_name} {m.last_name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {m.title} · {m.region || "No region"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.hires.length === 0 ? (
                      <span className="text-xs italic text-muted-foreground/70">None claimed yet</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {m.hires.map((h) => (
                          <Badge key={h} className="border-camp-green/20 bg-camp-green/10 text-[11px] text-foreground/90">
                            {h}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {m.comment_count > 0 ? (
                      <Badge className="border-blue-200 bg-blue-100 text-xs text-blue-700">{m.comment_count}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">0</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.last_viewed_at ? (
                      <span className="flex items-center gap-1 text-xs text-camp-green">
                        <Icon icon="eye" className="h-3 w-3" />
                        {new Date(m.last_viewed_at).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">Never viewed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
