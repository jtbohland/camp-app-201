import { useMemo, useState } from "react";
import HubTabBar from "@/components/HubTabBar/index.js";
import HubBoard from "@/components/HubBoard/index.js";
import HubPresentationTab from "@/components/HubPresentationTab/index.js";
import HubHomeRoster from "@/components/HubHomeRoster/index.js";
import HubHomeUpNext from "@/components/HubHomeUpNext/index.js";
import HubHomeTodos from "@/components/HubHomeTodos/index.js";
import HubHomeActivity from "@/components/HubHomeActivity/index.js";
import HubDeleteDialog from "@/components/HubDeleteDialog/index.js";
import { useHubPosts } from "./useHubPosts";
import { BOARD_SECTION, HOME_TAB, boardFor, presKey, type HubData, type HubItem, type HubMember } from "@/lib/teamHub";

type Company = { name: string; emoji?: string; industry?: string; color?: string } | null;

type Props = {
  teamId: number;
  hub: HubData;
  members: HubMember[];
  company: Company;
  rank: number | null;
  totalTeams: number;
  totalPoints: number;
  myName: string;
  fetching: boolean;
  refetch: () => Promise<unknown>;
};

/** Tabs + content for one team's hub. Data comes from the page; this owns tab state and post actions. */
export default function TeamHubView({ teamId, hub, members, company, rank, totalTeams, totalPoints, myName, fetching, refetch }: Props) {
  const [active, setActive] = useState<string>(HOME_TAB);
  const { viewer } = hub;
  const actions = useHubPosts({ teamId, myCamperId: viewer.camper_id, myName, members, refetch });

  const presentations = useMemo(
    () => [...hub.presentations].sort((a, b) => a.day_number - b.day_number || a.sort_order - b.sort_order),
    [hub.presentations],
  );
  const scheduledKeys = useMemo(() => new Set(presentations.map((p) => presKey(p.id))), [presentations]);

  // Every post lands on exactly one board; unmatched sections fall back to the Team Board.
  const byBoard = useMemo(() => {
    const m = new Map<string, HubItem[]>();
    for (const i of hub.items) {
      const key = boardFor(i.section, scheduledKeys);
      m.set(key, [...(m.get(key) ?? []), i]);
    }
    return m;
  }, [hub.items, scheduledKeys]);
  const postCounts = useMemo(() => new Map([...byBoard].map(([k, v]) => [k, v.length])), [byBoard]);

  const titleByKey = useMemo(() => new Map(presentations.map((p) => [presKey(p.id), p.title])), [presentations]);
  const boardLabel = (i: HubItem) => titleByKey.get(boardFor(i.section, scheduledKeys));

  // Peer feedback is stored by presentation title.
  const feedbackByPres = useMemo(() => {
    const m = new Map<number, typeof hub.peer_feedback>();
    for (const p of presentations) m.set(p.id, hub.peer_feedback.filter((f) => f.session_label === p.title));
    return m;
  }, [hub.peer_feedback, presentations]);
  const feedbackCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of presentations) {
      const score = hub.scores.some((s) => s.presentation_id === p.id && (p.scores_revealed || viewer.is_counselor)) ? 1 : 0;
      m.set(p.id, (feedbackByPres.get(p.id)?.length ?? 0) + score);
    }
    return m;
  }, [presentations, feedbackByPres, hub.scores, viewer.is_counselor]);

  const activePres = presentations.find((p) => presKey(p.id) === active) ?? null;
  const tasks = useMemo(() => hub.items.filter((i) => i.item_type === "task"), [hub.items]);
  const pinned = useMemo(() => hub.items.filter((i) => i.is_pinned), [hub.items]);

  const common = {
    members,
    myCamperId: viewer.camper_id,
    isCounselor: viewer.is_counselor,
    canContribute: viewer.can_contribute,
    actions,
  };

  return (
    <>
      <HubTabBar
        active={activePres || active === HOME_TAB || active === BOARD_SECTION ? active : HOME_TAB}
        presentations={presentations}
        postCounts={postCounts}
        boardCount={postCounts.get(BOARD_SECTION) ?? 0}
        onSelect={setActive}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {activePres ? (
          <HubPresentationTab
            key={activePres.id}
            presentation={activePres}
            teamId={teamId}
            companyName={company?.name ?? null}
            items={byBoard.get(presKey(activePres.id)) ?? []}
            feedback={feedbackByPres.get(activePres.id) ?? []}
            score={hub.scores.find((s) => s.presentation_id === activePres.id) ?? null}
            fetching={fetching}
            {...common}
          />
        ) : active === BOARD_SECTION ? (
          <div className="p-6">
            <HubBoard
              section={BOARD_SECTION}
              title="Team Board"
              hint="Anything that isn't tied to one session: team norms, research, shared links, and general to-dos."
              items={byBoard.get(BOARD_SECTION) ?? []}
              fetching={fetching}
              {...common}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4 p-6">
            <HubHomeRoster
              members={members}
              myCamperId={viewer.camper_id}
              company={company}
              rank={rank}
              totalTeams={totalTeams}
              totalPoints={totalPoints}
              presentingSlot={hub.presenting_slot}
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <HubHomeUpNext
                presentations={presentations}
                postCounts={postCounts}
                feedbackCounts={feedbackCounts}
                onOpen={setActive}
              />
              <HubHomeTodos tasks={tasks} boardLabel={boardLabel} {...common} />
            </div>
            <HubHomeActivity
              pinned={pinned}
              recent={hub.items}
              boardLabel={boardLabel}
              onOpenBoard={(i) => setActive(boardFor(i.section, scheduledKeys))}
            />
          </div>
        )}
      </div>

      <HubDeleteDialog item={actions.pendingDelete} onCancel={actions.cancelDelete} onConfirm={actions.confirmDelete} />
    </>
  );
}
