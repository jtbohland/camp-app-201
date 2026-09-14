import { useCallback } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";
import { useNavigate, useLocation } from "react-router";

type Props = {
  camperId: number;
  isAdmin: boolean;
};

export default function LateSurveyModal({ camperId, isAdmin }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  // Only poll when not already on the survey page
  const onSurveyPage = location.pathname === "/survey";

  // Use day 1 to get all day_statuses (the statuses are returned for all days regardless)
  const { data } = useApiData("GetDailySurvey", {
    camper_id: camperId,
    day_number: 1,
  }, {
    refetchInterval: 15000,
    enabled: camperId > 0 && !isAdmin && !onSurveyPage,
  });

  // Find first locked + incomplete day that hasn't been dismissed
  const dayStatuses: Array<{ day_number: number; submitted: boolean; locked: boolean }> = (data as any)?.day_statuses ?? [];
  const missedDay = dayStatuses.find(
    (ds) => ds.locked && !ds.submitted
  );

  const handleGoToSurvey = useCallback(() => {
    if (!missedDay) return;
    navigate(`/survey?late=true&day=${missedDay.day_number}`);
  }, [missedDay, navigate]);

  if (!missedDay) return null;

  const dayLabels: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Icon icon="clipboard-list" className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Survey Missed! 📋</h3>
            <p className="text-sm text-muted-foreground">
              Day {missedDay.day_number} ({dayLabels[missedDay.day_number]}) is closed
            </p>
          </div>
        </div>

        <p className="text-sm text-foreground/80 mb-2">
          You haven't submitted your Day {missedDay.day_number} survey yet. You can still complete it, but late submissions will result in:
        </p>
        <ul className="text-sm text-red-500 mb-4 space-y-1 pl-4">
          <li>• Reduced individual points</li>
          <li>• -3 team points penalty</li>
        </ul>

        <div className="space-y-2">
          <Button
            onClick={handleGoToSurvey}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Icon icon="clipboard-list" className="w-4 h-4 mr-2" />
            Complete Day {missedDay.day_number} Survey (Late)
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-3">
          This survey is required — you must complete it before continuing.
        </p>
      </div>
    </div>
  );
}
