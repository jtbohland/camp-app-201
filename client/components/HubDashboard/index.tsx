import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { IconName } from "lucide-react/dynamic";

type Props = {
  onNavigate: (section: string) => void;
};

export default function HubDashboard({ onNavigate }: Props) {
  const { data, loading, fetching } = useApiData("GetHubDashboard", {});

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const d = data!;

  return (
    <div className={`space-y-6 ${fetching ? "opacity-80" : ""}`}>
      {/* Welcome banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
        <h2 className="text-2xl font-bold">Welcome to Mission Control 🏕️</h2>
        <p className="text-emerald-100 mt-1 text-sm">
          Your command center for managing cAMP 201. Here's what's happening right now.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="users"
          label="Registered cAMPers"
          value={d.registered_campers}
          color="bg-blue-50 text-blue-600"
          onClick={() => onNavigate("campers")}
        />
        <StatCard
          icon="briefcase"
          label="Managers Registered"
          value={d.registered_managers}
          color="bg-purple-50 text-purple-600"
          onClick={() => onNavigate("analytics")}
        />
        <StatCard
          icon="flag"
          label="Teams Created"
          value={d.teams_created}
          color="bg-amber-50 text-amber-600"
          onClick={() => onNavigate("teams")}
        />
        <StatCard
          icon="target"
          label="Activities Unlocked"
          value={`${d.presentations_unlocked}/${d.presentations_total}`}
          color="bg-emerald-50 text-emerald-600"
          onClick={() => onNavigate("presentations")}
        />
        <StatCard
          icon="log-in"
          label="Check-ins Today"
          value={d.checkins_today}
          color="bg-teal-50 text-teal-600"
        />
        <StatCard
          icon="clipboard-list"
          label="Surveys Today"
          value={d.surveys_submitted_today}
          color="bg-orange-50 text-orange-600"
          onClick={() => onNavigate("analytics")}
        />
        <StatCard
          icon="book-open"
          label="Pre-Work Done"
          value={`${d.prework_completion_pct}%`}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon="unlock"
          label="Gates Open"
          value={`${d.gates_unlocked}/${d.gates_total}`}
          color="bg-rose-50 text-rose-600"
          onClick={() => onNavigate("gates")}
        />
      </div>

      {/* Highlights row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* XP Leader */}
        <Card className="p-5 border-l-4 border-l-amber-400">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Icon icon="trophy" className="w-3.5 h-3.5 text-amber-500" />
            XP Leader
          </div>
          {d.top_camper ? (
            <div>
              <p className="text-lg font-bold text-foreground">{d.top_camper.name}</p>
              <p className="text-sm text-amber-600 font-semibold">{d.top_camper.xp} XP</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data yet</p>
          )}
        </Card>

        {/* Top Team */}
        <Card className="p-5 border-l-4 border-l-emerald-400">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Icon icon="flag" className="w-3.5 h-3.5 text-emerald-500" />
            Leading Team
          </div>
          {d.top_team ? (
            <div>
              <p className="text-lg font-bold text-foreground">{d.top_team.name}</p>
              <p className="text-sm text-emerald-600 font-semibold">{d.top_team.points} pts</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No teams yet</p>
          )}
        </Card>

        {/* Avg XP */}
        <Card className="p-5 border-l-4 border-l-blue-400">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Icon icon="bar-chart-3" className="w-3.5 h-3.5 text-blue-500" />
            Average XP
          </div>
          <p className="text-lg font-bold text-foreground">{d.avg_xp} XP</p>
          <p className="text-xs text-muted-foreground">per cAMPer</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction icon="user-plus" label="Add cAMPers" onClick={() => onNavigate("cohort")} />
          <QuickAction icon="award" label="Award XP" onClick={() => onNavigate("campers")} />
          <QuickAction icon="lock" label="Manage Gates" onClick={() => onNavigate("gates")} />
          <QuickAction icon="presentation" label="Unlock Activity" onClick={() => onNavigate("presentations")} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, onClick }: {
  icon: IconName;
  label: string;
  value: string | number;
  color: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon icon={icon} className="w-5 h-5" />
      </div>
      <div className="text-left">
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </Wrapper>
  );
}

function QuickAction({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-sm font-medium text-foreground"
    >
      <Icon icon={icon} className="w-4 h-4 text-primary" />
      {label}
    </button>
  );
}
