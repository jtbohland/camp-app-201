import { useNavigate } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import HireCard from "@/components/HireCard";

export default function ManagerDashboard() {
  const user = useSuperblocksUser();
  const navigate = useNavigate();

  const { data: managerCheck, loading: checkingManager } = useApiData("GetCurrentManager", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const { data: dashboard, loading, fetching, refetch } = useApiData("GetManagerDashboard", {
    manager_email: user?.email ?? "",
  }, { enabled: !!user?.email && managerCheck?.isManager === true });

  if (checkingManager || loading) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  if (!managerCheck?.isManager) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Icon icon="lock" className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold">Manager Portal</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          This area is for registered managers. If you&apos;re a manager of a cAMP 201 attendee,
          please register from the home page.
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          <Icon icon="arrow-left" className="w-4 h-4" />
          Go to Home
        </button>
      </div>
    );
  }

  const manager = dashboard?.manager;
  const hires = dashboard?.hires ?? [];
  const totalCampers = dashboard?.total_campers ?? 0;
  const totalSurveys = dashboard?.total_surveys ?? 0;

  return (
    <div className="flex flex-col gap-6 p-8 max-w-4xl overflow-auto">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 p-8 text-white">
        <div className="absolute top-0 right-0 opacity-10">
          <Icon icon="binoculars" className="w-40 h-40 -mt-6 -mr-6" />
        </div>
        <div className="relative">
          <p className="text-sm opacity-80 mb-1">Manager Portal</p>
          <h1 className="text-2xl font-bold">
            {manager?.first_name} {manager?.last_name}
          </h1>
          <p className="text-sm opacity-70 mt-1">{manager?.title}</p>
          <div className="flex items-center gap-3 mt-4">
            <Badge className="bg-white/15 text-white border-white/20">
              <Icon icon="users" className="w-3.5 h-3.5 mr-1" />
              {hires.length} cAMPer{hires.length !== 1 ? "s" : ""}
            </Badge>
            {fetching && (
              <span className="text-xs opacity-60 flex items-center gap-1">
                <Icon icon="loader-2" className="w-3 h-3 animate-spin" />
                Updating…
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hire cards */}
      {hires.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Icon icon="users" className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No hires linked yet</p>
          <p className="text-sm mt-1">Register from the home page to select your new hires.</p>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 ${fetching ? "opacity-70" : ""}`}>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icon icon="users" className="w-5 h-5 text-blue-500" />
            Your cAMPers
          </h2>
          {hires.map((hire) => (
            <HireCard
              key={hire.camper.id}
              hire={hire}
              totalCampers={totalCampers}
              totalSurveys={totalSurveys}
              managerEmail={user?.email ?? ""}
              onCommentAdded={refetch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
