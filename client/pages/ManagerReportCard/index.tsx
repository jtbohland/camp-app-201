import { useNavigate, useParams } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";
import ReportCard from "@/components/ReportCard/index.js";
import HireConversations from "@/components/HireConversations/index.js";

/** Manager Portal → one hire's full report card, activity timeline and conversation. */
export default function ManagerReportCard() {
  const { camperId } = useParams();
  const id = Number(camperId);
  const navigate = useNavigate();
  const user = useSuperblocksUser();

  // Same cache entry as the Manager Portal, so threads stay in sync with the hire cards.
  const { data: dashboard } = useApiData("GetManagerDashboard", { manager_email: user?.email ?? "" }, { enabled: !!user?.email });
  const { data: closeStatus } = useApiData("GetCloseCampStatus", {}, { staleTime: 30000 });
  const hire = dashboard?.hires.find((h) => h.camper.id === id);

  const back = (
    <Button variant="ghost" size="sm" onClick={() => navigate("/manager")} className="print:hidden">
      <Icon icon="arrow-left" className="mr-1 h-4 w-4" />
      My cAMPers
    </Button>
  );

  if (!Number.isInteger(id) || id <= 0) {
    return (
      <div className="flex h-full w-full flex-col gap-4 overflow-auto p-8">
        {back}
        <Card className="p-6 text-center text-sm text-muted-foreground">That report card link isn’t valid.</Card>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-auto p-6 md:p-8">
      <div>{back}</div>
      <ReportCard
        camperId={id}
        viewer="manager"
        conversations={
          hire ? (
            <Card className="p-5 print:hidden">
              <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Icon icon="messages-square" className="h-4 w-4 text-blue-500" />
                Your conversation with {hire.camper.first_name}
              </h3>
              <HireConversations
                camperId={hire.camper.id}
                camperFirstName={hire.camper.first_name}
                threads={hire.threads}
                unreadCount={hire.unread_count}
                canWrite={!(closeStatus?.camp_closed ?? false)}
              />
            </Card>
          ) : null
        }
      />
    </div>
  );
}
