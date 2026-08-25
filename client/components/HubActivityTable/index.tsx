import { useApiData } from "@/hooks/useApiData.js";

export default function HubActivityTable() {
  const { data, loading } = useApiData("GetHubActivity", {});

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-muted/30 border-b border-border">
        <h3 className="font-semibold text-foreground text-sm">Hub Participation Tracker</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Track who's contributing across team hubs</p>
      </div>

      {loading ? (
        <div className="p-6 text-center text-muted-foreground text-sm">Loading activity…</div>
      ) : data?.activity && data.activity.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Camper</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Team</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground">Contributions</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.activity.map((row) => (
                <tr key={row.camper_id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2 text-foreground font-medium">
                    {row.first_name} {row.last_name}
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{row.team_name}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-semibold rounded-full px-2 py-0.5 text-xs">
                      {row.contribution_count}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">
                    {row.last_contribution
                      ? new Date(row.last_contribution).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-muted-foreground text-sm">
          No hub contributions yet. Once team members start collaborating, activity will appear here.
        </div>
      )}
    </div>
  );
}
