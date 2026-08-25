import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLearnerGrid from "@/components/AdminLearnerGrid";
import AdminTeamView from "@/components/AdminTeamView";
import AdminCamperDetail from "@/components/AdminCamperDetail";

const ADMIN_PASSWORD = "NewAchievement201";

type View = "learners" | "teams" | "camper-detail";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [view, setView] = useState<View>("learners");
  const [selectedCohortId, setSelectedCohortId] = useState<number | null>(null);
  const [selectedCamperId, setSelectedCamperId] = useState<number | null>(null);

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
    setView("learners");
    setSelectedCamperId(null);
  }, []);

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 via-emerald-900 to-green-950 p-4">
        <Card className="w-full max-w-sm p-8 bg-white/95 backdrop-blur border-0 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Icon name="shield" className="w-8 h-8 text-emerald-700" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Counselor Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Enter admin password to continue</p>
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
            <Button onClick={handleLogin} className="w-full bg-emerald-700 hover:bg-emerald-800">
              <Icon name="lock" className="w-4 h-4 mr-2" />
              Access Admin
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-emerald-900 to-green-950 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {view === "camper-detail" && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="text-white hover:bg-white/10">
                <Icon name="arrow-left" className="w-4 h-4 mr-1" />
                Back
              </Button>
            )}
            <h1 className="text-2xl font-bold text-white">
              <Icon name="shield" className="w-6 h-6 inline mr-2" />
              Counselor Hub
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Cohort Switcher */}
            {cohortsData?.cohorts && (
              <Select
                value={selectedCohortId?.toString() ?? "active"}
                onValueChange={(val) => setSelectedCohortId(val === "active" ? null : Number(val))}
              >
                <SelectTrigger className="w-48 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Active Cohort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Cohort</SelectItem>
                  {cohortsData.cohorts.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} {c.is_active ? "✦" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* View Toggle */}
            {view !== "camper-detail" && (
              <div className="flex bg-white/10 rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("learners")}
                  className={`text-white ${view === "learners" ? "bg-white/20" : "hover:bg-white/10"}`}
                >
                  <Icon name="users" className="w-4 h-4 mr-1" />
                  Learners
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("teams")}
                  className={`text-white ${view === "teams" ? "bg-white/20" : "hover:bg-white/10"}`}
                >
                  <Icon name="flag" className="w-4 h-4 mr-1" />
                  Teams
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {view === "learners" && (
          <AdminLearnerGrid cohortId={selectedCohortId} onCamperClick={handleCamperClick} />
        )}
        {view === "teams" && (
          <AdminTeamView cohortId={selectedCohortId} onCamperClick={handleCamperClick} />
        )}
        {view === "camper-detail" && selectedCamperId && (
          <AdminCamperDetail camperId={selectedCamperId} onBack={handleBack} />
        )}
      </div>
    </div>
  );
}
