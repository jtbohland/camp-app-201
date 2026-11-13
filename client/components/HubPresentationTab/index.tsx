import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import HubBrief from "@/components/HubBrief/index.js";
import HubBoard from "@/components/HubBoard/index.js";
import HubFeedbackReceived from "@/components/HubFeedbackReceived/index.js";
import HubTeamTool, { teamToolLabel } from "@/components/HubTeamTool/index.js";
import {
  isTeamWork, prepStatus, presKey, presTypeMeta,
  type HubFeedback, type HubItem, type HubMember, type HubPresentation, type HubScore,
} from "@/lib/teamHub";
import type { HubPostActions } from "@/components/TeamHubView/useHubPosts";

type Props = {
  presentation: HubPresentation;
  teamId: number;
  companyName: string | null;
  items: HubItem[];
  feedback: HubFeedback[];
  score: HubScore | null;
  members: HubMember[];
  myCamperId: number | null;
  isCounselor: boolean;
  canContribute: boolean;
  actions: HubPostActions;
  fetching: boolean;
};

type SubTab = "brief" | "tool" | "board" | "feedback";

/** Everything a team needs for one presentation: brief, the working tool, shared board, and feedback. */
export default function HubPresentationTab(props: Props) {
  const { presentation: p, items, feedback, score, isCounselor } = props;
  const locked = p.is_locked && !isCounselor;
  const toolLabel = teamToolLabel(p);
  const status = prepStatus(p, items.length);
  const meta = presTypeMeta(p.presentation_type);
  const feedbackCount = feedback.length + (score ? 1 : 0);

  const tabs: { id: SubTab; label: string; icon: string; show: boolean }[] = [
    { id: "brief", label: "Brief", icon: "flag", show: true },
    { id: "tool", label: toolLabel ?? "", icon: "pencil-ruler", show: !!toolLabel && !locked },
    { id: "board", label: `Team board${items.length ? ` (${items.length})` : ""}`, icon: "layout-list", show: true },
    { id: "feedback", label: `Feedback${feedbackCount ? ` (${feedbackCount})` : ""}`, icon: "message-circle", show: isTeamWork(p.presentation_type) },
  ];
  // Teams land on the tool when there is one (that's where the work happens).
  const [tab, setTab] = useState<SubTab>(toolLabel && !locked ? "tool" : "brief");
  const active = tabs.find((t) => t.id === tab && t.show) ? tab : "brief";

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Icon icon={meta.icon} className="h-5 w-5 text-primary" /> {p.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Day {p.day_number} · {meta.label}
            {isTeamWork(p.presentation_type) && ` · ${status.label}`}
          </p>
        </div>
        <StatusPill presentation={p} />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {tabs.filter((t) => t.show).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon icon={t.icon as "flag"} className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {active === "brief" && (locked ? <LockedBrief /> : <HubBrief presentation={p} />)}
      {active === "tool" && !locked && (
        <HubTeamTool
          presentation={p}
          teamId={props.teamId}
          camperId={props.myCamperId ?? 0}
          isCounselor={isCounselor}
          companyName={props.companyName}
        />
      )}
      {active === "board" && (
        <HubBoard
          section={presKey(p.id)}
          title="Team board"
          hint="Your team's notes, decisions, owners, and deck links for this session."
          items={items}
          members={props.members}
          myCamperId={props.myCamperId}
          isCounselor={isCounselor}
          canContribute={props.canContribute}
          actions={props.actions}
          fetching={props.fetching}
        />
      )}
      {active === "feedback" && (
        <HubFeedbackReceived
          feedback={feedback}
          score={score}
          scoreHiddenFromTeam={isCounselor && !p.scores_revealed}
        />
      )}
    </div>
  );
}

function StatusPill({ presentation: p }: { presentation: HubPresentation }) {
  if (p.status === "in_progress") {
    return <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Live now</span>;
  }
  if (p.status === "completed") {
    return <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Completed</span>;
  }
  if (p.is_locked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
        <Icon icon="lock" className="h-3 w-3" /> Locked
      </span>
    );
  }
  return <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700">Open</span>;
}

function LockedBrief() {
  return (
    <Card className="p-8 text-center">
      <Icon icon="lock" className="mx-auto h-8 w-8 text-muted-foreground/40" />
      <p className="mt-2 text-sm font-medium text-foreground">The brief unlocks when it's time</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Counselors open each session's brief, tools, and team board during cAMP.
      </p>
    </Card>
  );
}
