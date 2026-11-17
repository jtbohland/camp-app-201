import TeamWorkspaceForm from "@/components/TeamWorkspaceForm/index.js";
import HackathonShowcase from "@/components/HackathonShowcase/index.js";
import CounselorRoleAssignment from "@/components/CounselorRoleAssignment/index.js";
import type { HubPresentation } from "@/lib/teamHub";

type Question = { section: string; questions: string[] };

const isEbr = (p: HubPresentation) => p.title.toLowerCase().includes("ebr");
const questionsOf = (p: HubPresentation) => (Array.isArray(p.questions) ? (p.questions as Question[]) : []);

/** Name of the hands-on tool for this presentation, or null when it has none. */
export function teamToolLabel(p: HubPresentation): string | null {
  if (p.presentation_type === "hackathon") return "Showcase";
  if (isEbr(p)) return "Role play";
  // Every team session's questions are answered together in one shared workspace.
  if (p.question_count > 0) return "Team workspace";
  return null;
}

type Props = {
  presentation: HubPresentation;
  teamId: number;
  camperId: number;
  isCounselor: boolean;
  companyName: string | null;
};

/**
 * The working tool for one team session. Everything here is shared: whatever one teammate saves,
 * the whole team sees (it refreshes on its own).
 */
export default function HubTeamTool({ presentation: p, teamId, camperId, isCounselor, companyName }: Props) {
  if (p.presentation_type === "hackathon") {
    return <HackathonShowcase presentationId={p.id} camperId={camperId} camperTeamId={teamId} isAdmin={isCounselor} />;
  }
  if (isEbr(p)) {
    return <CounselorRoleAssignment presentationId={p.id} teamId={teamId} camperId={camperId} />;
  }
  if (p.question_count > 0) {
    return (
      <TeamWorkspaceForm
        presentationId={p.id}
        teamId={teamId}
        camperId={camperId}
        questions={questionsOf(p)}
        companyName={companyName ?? undefined}
      />
    );
  }
  return null;
}
