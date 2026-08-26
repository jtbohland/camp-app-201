import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useSuperblocksUser } from "@superblocksteam/library";
import SurveyForm from "@/components/SurveyForm/index.js";
import SurveyAdmin from "@/components/SurveyAdmin/index.js";

export default function SurveyPage() {
  const user = useSuperblocksUser();
  const [submitted, setSubmitted] = useState(false);
  const [pointsAwarded, setPointsAwarded] = useState(0);
  const [teamBonusAwarded, setTeamBonusAwarded] = useState(false);

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camper = camperData?.camper;
  const camperId = camper?.id ?? 0;
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

  const { data: surveyData, loading: loadingSurvey, fetching } = useApiData("GetActiveSurvey", {
    camper_id: camperId || null,
  }, { enabled: camperId > 0 });

  if (loadingCamper || loadingSurvey) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  // Admin view
  if (isAdmin) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <SurveyAdmin counselorId={camperId} />
      </div>
    );
  }

  // Already submitted
  if (submitted || surveyData?.already_submitted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <SuccessView pointsAwarded={pointsAwarded} teamBonusAwarded={teamBonusAwarded} />
      </div>
    );
  }

  // No active survey
  if (!surveyData?.survey) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <NoSurveyView />
      </div>
    );
  }

  // Show survey form
  return (
    <div className={`max-w-2xl mx-auto p-6 ${fetching ? "opacity-70" : ""}`}>
      <SurveyForm
        survey={{
          id: surveyData.survey.id,
          title: surveyData.survey.title,
          description: surveyData.survey.description,
          day_number: surveyData.survey.day_number,
          points_per_completion: surveyData.survey.points_per_completion,
          team_bonus_points: surveyData.survey.team_bonus_points,
          questions: (Array.isArray(surveyData.survey.questions) ? surveyData.survey.questions : []).map((q: any) => ({
            id: q.id,
            text: q.text,
            type: q.type as "rating" | "text" | "multiple_choice",
            options: q.options,
          })),
        }}
        camperId={camperId}
        teamCompletion={surveyData.team_completion}
        onSubmitSuccess={(pts, bonus) => {
          setPointsAwarded(pts);
          setTeamBonusAwarded(bonus);
          setSubmitted(true);
        }}
      />
    </div>
  );
}

function SuccessView({ pointsAwarded, teamBonusAwarded }: { pointsAwarded: number; teamBonusAwarded: boolean }) {
  return (
    <Card className="p-8 text-center bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-700/30">
      <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-600/20 mb-4">
        <Icon icon="check-circle-2" className="w-8 h-8 text-green-400" />
      </div>
      <h2 className="text-xl font-bold text-foreground mb-2">Survey Submitted!</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Thank you for sharing your reflections today.
      </p>
      {pointsAwarded > 0 && (
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-600/20 border border-amber-600/30">
          <Icon icon="star" className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">+{pointsAwarded} points earned</span>
        </div>
      )}
      {teamBonusAwarded && (
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-600/20 border border-green-600/30">
          <Icon icon="users" className="w-4 h-4 text-green-400" />
          <span className="text-sm font-semibold text-green-300">Team completion bonus!</span>
        </div>
      )}
    </Card>
  );
}

function NoSurveyView() {
  return (
    <Card className="p-8 text-center">
      <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-muted/30 mb-4">
        <Icon icon="moon" className="w-8 h-8 text-muted-foreground/50" />
      </div>
      <h2 className="text-lg font-bold text-foreground mb-2">No Survey Active</h2>
      <p className="text-sm text-muted-foreground">
        Check back at the end of the day — your counselor will open the daily reflection survey.
      </p>
    </Card>
  );
}
