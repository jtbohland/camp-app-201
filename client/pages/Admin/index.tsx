import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { IconName } from "lucide-react/dynamic";

// Existing components
import AdminLearnerGrid from "@/components/AdminLearnerGrid";
import AdminTeamView from "@/components/AdminTeamView";
import AdminCamperDetail from "@/components/AdminCamperDetail";
import AdminFlightSummary from "@/components/AdminFlightSummary/index.js";
import AdminPreworkSettings from "@/components/AdminPreworkSettings/index.js";
import AdminManagerOverview from "@/components/AdminManagerOverview/index.js";
import RegistrationForm from "@/components/RegistrationForm/index.js";
import ManagerRegistrationForm from "@/components/ManagerRegistrationForm/index.js";
import AdminSurveyResults from "@/components/AdminSurveyResults/index.js";
import AdminFeatureGates from "@/components/AdminFeatureGates/index.js";
import AgendaScheduleTab from "@/components/AgendaScheduleTab/index.js";
import AdminCounselorProfile from "@/components/AdminCounselorProfile/index.js";
import AdminTeamGenerator from "@/components/AdminTeamGenerator/index.js";
import AdminCounselorRotation from "@/components/AdminCounselorRotation/index.js";
import AdminPresentations from "@/components/AdminPresentations/index.js";

// New components
import HubDashboard from "@/components/HubDashboard/index.js";
import LayOfTheLand from "@/components/LayOfTheLand/index.js";
import NewHireManager from "@/components/NewHireManager/index.js";

const ADMIN_PASSWORD = "NewAchievement201";

/* ─── Sidebar Nav Config ─── */
type NavSection = {
  heading: string;
  items: { key: string; label: string; icon: IconName; badge?: string }[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    heading: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", icon: "layout-dashboard" },
      { key: "guide", label: "Lay of the Land", icon: "book-open" },
    ],
  },
  {
    heading: "People",
    items: [
      { key: "campers", label: "cAMPers", icon: "users" },
      { key: "teams", label: "Teams", icon: "flag" },
      { key: "analytics", label: "Analytics & Surveys", icon: "bar-chart-3" },
    ],
  },
  {
    heading: "Program",
    items: [
      { key: "schedule", label: "Agenda", icon: "calendar" },
      { key: "presentations", label: "Activities", icon: "target" },
      { key: "gates", label: "Feature Gates", icon: "lock" },
    ],
  },
  {
    heading: "Operations",
    items: [
      { key: "flights", label: "Travel & Flights", icon: "plane" },
      { key: "cabin", label: "Counselor Cabin", icon: "tent" },
      { key: "cohort", label: "Cohort Management", icon: "archive" },
      { key: "settings", label: "Settings", icon: "settings" },
    ],
  },
];

type View = string;

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [view, setView] = useState<View>("dashboard");
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [selectedCamperId, setSelectedCamperId] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { data: cohortsData } = useApiData("GetCohorts", {}, { enabled: authenticated });

  const handleLogin = useCallback(() => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  }, [password]);

  const handleCamperClick = useCallback((camperId: number) => {
    setSelectedCamperId(camperId);
    setView("camper-detail");
  }, []);

  const handleBack = useCallback(() => {
    setView("campers");
    setSelectedCamperId(null);
  }, []);

  const handleNavigate = useCallback((section: string) => {
    setView(section);
    setSelectedCamperId(null);
  }, []);

  /* ─── Login Screen ─── */
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-sm p-8 shadow-xl border-0">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏕️</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Mission Control</h1>
            <p className="text-sm text-muted-foreground mt-1">Counselor Hub — Enter password to continue</p>
          </div>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={passwordError ? "border-red-400" : ""}
            />
            {passwordError && (
              <p className="text-xs text-red-500">Incorrect password. Try again.</p>
            )}
            <Button onClick={handleLogin} className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Icon icon="shield" className="w-4 h-4 mr-2" />
              Access Mission Control
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  /* ─── Demo Registration Views ─── */
  if (view === "demo-reg-camper" || view === "demo-reg-manager") {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-7xl mx-auto mb-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setView("cohort")}>
              <Icon icon="arrow-left" className="w-4 h-4 mr-1" />
              Back to Hub
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              Registration Preview {view === "demo-reg-camper" ? "(cAMPer)" : "(Manager)"}
            </h1>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 font-medium">
              Demo Mode — No data saved
            </span>
          </div>
        </div>
        <div className="max-w-7xl mx-auto bg-background rounded-xl overflow-hidden shadow-lg border border-border">
          {view === "demo-reg-camper" ? (
            <RegistrationForm userEmail="demo@example.com" onSuccess={() => setView("cohort")} />
          ) : (
            <ManagerRegistrationForm userEmail="demo@example.com" onSuccess={() => setView("cohort")} />
          )}
        </div>
      </div>
    );
  }

  /* ─── Get page title and breadcrumb ─── */
  const allItems = NAV_SECTIONS.flatMap((s) => s.items);
  const activeItem = allItems.find((i) => i.key === view);
  const pageTitle = view === "camper-detail"
    ? "cAMPer Detail"
    : activeItem?.label ?? "Dashboard";

  /* ─── Main Layout ─── */
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside className={`flex flex-col border-r border-border bg-white shrink-0 transition-all ${sidebarCollapsed ? "w-16" : "w-60"}`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          {!sidebarCollapsed && (
            <>
              <span className="text-lg">🏕️</span>
              <span className="font-bold text-sm text-foreground">Mission Control</span>
            </>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          >
            <Icon icon={sidebarCollapsed ? "panel-right-open" : "panel-left-close"} className="w-4 h-4" />
          </button>
        </div>

        {/* Cohort Switcher */}
        {!sidebarCollapsed && cohortsData?.cohorts && (
          <div className="px-3 py-2 border-b border-border">
            <Select
              value={selectedCohortId?.toString() ?? "active"}
              onValueChange={(val) => setSelectedCohortId(val === "active" ? null : Number(val))}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Active Cohort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Cohort</SelectItem>
                {cohortsData.cohorts.map((c: { id: number; name: string; is_active: boolean }) => (
                  <SelectItem key={c.id} value={c.id.toString()}>
                    {c.name} {c.is_active ? "✦" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading} className="mb-1">
              {!sidebarCollapsed && (
                <p className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.heading}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = view === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavigate(item.key)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                      isActive
                        ? "bg-emerald-50 text-emerald-700 font-medium border-r-2 border-emerald-600"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                  >
                    <Icon icon={item.icon} className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-600" : ""}`} />
                    {!sidebarCollapsed && <span>{item.label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Preview links */}
        {!sidebarCollapsed && (
          <div className="px-3 py-3 border-t border-border space-y-1">
            <button
              onClick={() => setView("demo-reg-camper")}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50"
            >
              <Icon icon="eye" className="w-3.5 h-3.5" />
              Preview cAMPer Reg
            </button>
            <button
              onClick={() => setView("demo-reg-manager")}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-accent/50"
            >
              <Icon icon="eye" className="w-3.5 h-3.5" />
              Preview Manager Reg
            </button>
          </div>
        )}
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 h-14 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-2">
            {view === "camper-detail" && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <Icon icon="arrow-left" className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <h1 className="text-lg font-bold text-foreground">{pageTitle}</h1>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-6">
          {view === "dashboard" && (
            <HubDashboard onNavigate={handleNavigate} />
          )}
          {view === "guide" && (
            <LayOfTheLand onNavigate={handleNavigate} />
          )}
          {view === "campers" && (
            <AdminLearnerGrid cohortId={selectedCohortId} onCamperClick={handleCamperClick} />
          )}
          {view === "camper-detail" && selectedCamperId && (
            <AdminCamperDetail camperId={selectedCamperId} onBack={handleBack} />
          )}
          {view === "teams" && (
            <div className="space-y-6">
              <AdminTeamView cohortId={selectedCohortId} onCamperClick={handleCamperClick} />
              <AdminTeamGenerator />
            </div>
          )}
          {view === "schedule" && (
            <AgendaScheduleTab />
          )}
          {view === "presentations" && (
            <AdminPresentations />
          )}
          {view === "gates" && (
            <AdminFeatureGates />
          )}
          {view === "analytics" && (
            <div className="space-y-6">
              <AdminManagerOverview />
              <AdminSurveyResults />
            </div>
          )}
          {view === "flights" && (
            <AdminFlightSummary />
          )}
          {view === "cabin" && (
            <div className="space-y-6">
              <AdminCounselorProfile />
              <AdminCounselorRotation />
            </div>
          )}
          {view === "cohort" && (
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon icon="user-plus" className="w-4 h-4 text-camp-green" />
                  New Hire Pipeline
                </h3>
                <NewHireManager cohortId={selectedCohortId ?? 2} camperId={0} />
              </div>
              <div className="border-t pt-6">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Icon icon="settings" className="w-4 h-4 text-muted-foreground" />
                  Program Settings
                </h3>
                <AdminPreworkSettings />
              </div>
            </div>
          )}
          {view === "settings" && (
            <AdminPreworkSettings />
          )}
        </div>
      </main>
    </div>
  );
}
