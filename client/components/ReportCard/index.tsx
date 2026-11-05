import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import ReportHeader from "./ReportHeader.js";
import {
  AttendanceSection,
  BadgesSection,
  EngagementSection,
  GoalsSection,
  PointsSection,
  PresentationsSection,
  ProfileSection,
  TeamSection,
} from "./ReportSections.js";

/** Counselor Hub → cAMPer report card: everything one cAMPer has done, earned and lost. */
export default function ReportCard({ camperId }: { camperId: number }) {
  const { data, loading, fetching, isError, error, refetch } = useApiData("GetCamperReportCard", { camper_id: camperId });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 rounded-2xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      </div>
    );
  }
  if (isError) {
    const msg = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Request failed";
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-destructive">Couldn't load the report card: {msg}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>Try again</Button>
      </Card>
    );
  }
  if (!data?.found || !data.profile || !data.stats) {
    return <p className="py-8 text-center text-muted-foreground">cAMPer not found</p>;
  }

  return (
    <div className={`space-y-4 print:space-y-3 ${fetching ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-end gap-2 print:hidden">
        {fetching && <span className="text-xs text-muted-foreground">Updating…</span>}
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Icon icon="printer" className="mr-1 h-4 w-4" />
          Print / save PDF
        </Button>
      </div>
      <ReportHeader data={data} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PointsSection data={data} />
        <AttendanceSection data={data} />
        <EngagementSection data={data} />
        <BadgesSection data={data} />
        <GoalsSection data={data} />
        <PresentationsSection data={data} />
        <TeamSection data={data} />
        <ProfileSection data={data} />
      </div>
    </div>
  );
}
