import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import HubPostCard from "@/components/HubPostCard/index.js";
import HubComposer from "@/components/HubComposer/index.js";
import { BOARD_SECTION, type HubItem, type HubMember } from "@/lib/teamHub";
import type { HubPostActions } from "@/components/TeamHubView/useHubPosts";

type Props = {
  tasks: HubItem[];
  members: HubMember[];
  myCamperId: number | null;
  isCounselor: boolean;
  canContribute: boolean;
  boardLabel: (item: HubItem) => string | undefined;
  actions: HubPostActions;
};

/** Open to-dos from every board, "mine" first. New to-dos go on the Team Board. */
export default function HubHomeTodos({ tasks, members, myCamperId, isCounselor, canContribute, boardLabel, actions }: Props) {
  const [composing, setComposing] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const open = useMemo(
    () =>
      tasks
        .filter((t) => !t.is_done)
        .sort((a, b) => Number(b.assignee_id === myCamperId) - Number(a.assignee_id === myCamperId)),
    [tasks, myCamperId],
  );
  const done = useMemo(() => tasks.filter((t) => t.is_done), [tasks]);
  const mine = open.filter((t) => t.assignee_id === myCamperId).length;
  const list = showDone ? [...open, ...done] : open;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Team to-dos</h3>
          <p className="text-xs text-muted-foreground">
            {open.length} open{mine > 0 && ` · ${mine} assigned to you`}{done.length > 0 && ` · ${done.length} done`}
          </p>
        </div>
        {canContribute && !composing && (
          <Button size="sm" variant="outline" onClick={() => setComposing(true)}>
            <Icon icon="plus" className="mr-1 h-4 w-4" /> To-do
          </Button>
        )}
      </div>

      {composing && (
        <div className="mb-3">
          <HubComposer
            members={members}
            saving={actions.adding}
            defaultType="task"
            onSubmit={async (post) => {
              const ok = await actions.add(BOARD_SECTION, post);
              if (ok) setComposing(false);
              return ok;
            }}
            onCancel={() => setComposing(false)}
          />
        </div>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No open to-dos. Split up the work for your next session — who's building the deck, who's researching?
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.slice(0, 20).map((t) => (
            <HubPostCard
              key={t.id}
              item={t}
              members={members}
              myCamperId={myCamperId}
              isCounselor={isCounselor}
              canContribute={canContribute}
              boardLabel={boardLabel(t)}
              onPatch={actions.patch}
              onDelete={actions.requestDelete}
            />
          ))}
        </div>
      )}
      {done.length > 0 && (
        <button type="button" onClick={() => setShowDone((v) => !v)} className="mt-2 text-xs text-muted-foreground hover:text-foreground">
          {showDone ? "Hide done" : `Show ${done.length} done`}
        </button>
      )}
    </Card>
  );
}
