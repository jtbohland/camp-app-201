import { useCallback, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { useApi } from "@/hooks/useApi.js";
import { usePointsBubble } from "@/components/PointsBubble/index.js";
import { errorText, type HubData, type HubItem, type HubMember } from "@/lib/teamHub";
import type { NewPost } from "@/components/HubComposer/index.js";
import type { PostPatch } from "@/components/HubPostCard/index.js";

type Args = {
  teamId: number;
  myCamperId: number | null;
  myName: string;
  members: HubMember[];
  refetch: () => Promise<unknown>;
};

/**
 * Add / edit / pin / complete / delete hub posts. Each change shows at once (optimistic),
 * then the hub refetches; on failure the previous posts come back and a toast explains why.
 */
export function useHubPosts({ teamId, myCamperId, myName, members, refetch }: Args) {
  const { run: addItem, loading: adding } = useApi("AddHubItem");
  const { run: updateItem } = useApi("UpdateHubItem");
  const { run: deleteItem } = useApi("DeleteHubItem");
  const showPoints = usePointsBubble();
  const [pendingDelete, setPendingDelete] = useState<HubItem | null>(null);

  const cacheKey = queryClient.buildCacheKey("GetTeamHub", { team_id: teamId });

  /** Apply `change` to the cached posts; returns the previous cache to restore on failure. */
  const applyLocal = useCallback(
    (change: (items: HubItem[]) => HubItem[]) => {
      const previous = queryClient.getQueryData<HubData>(cacheKey);
      if (previous) queryClient.setQueryData<HubData>(cacheKey, { ...previous, items: change(previous.items) });
      return previous;
    },
    [cacheKey],
  );

  const restore = useCallback(
    (previous: HubData | undefined) => {
      if (previous) queryClient.setQueryData<HubData>(cacheKey, previous);
    },
    [cacheKey],
  );

  const add = useCallback(
    async (section: string, post: NewPost): Promise<boolean> => {
      const now = new Date().toISOString();
      const assignee = members.find((m) => m.id === post.assignee_id);
      const temp: HubItem = {
        id: -Date.now(),
        team_id: teamId,
        author_id: myCamperId ?? 0,
        author_name: myName,
        section,
        item_type: post.item_type,
        title: post.title,
        content: post.content,
        link_url: post.link_url,
        is_pinned: false,
        is_done: false,
        assignee_id: post.assignee_id,
        assignee_name: assignee ? `${assignee.first_name} ${assignee.last_name}` : null,
        created_at: now,
        updated_at: now,
      };
      const previous = applyLocal((items) => [temp, ...items]);
      try {
        const res = await addItem({
          team_id: teamId,
          section,
          item_type: post.item_type as "note",
          title: post.title,
          content: post.content,
          link_url: post.link_url,
          assignee_id: post.assignee_id,
        });
        toast.success("Posted to your Team Hub");
        if (res && res.xp_awarded > 0) showPoints(res.xp_awarded);
        await refetch();
        return true;
      } catch (error) {
        restore(previous);
        toast.error("Couldn't post: " + errorText(error));
        return false;
      }
    },
    [addItem, applyLocal, restore, refetch, showPoints, teamId, myCamperId, myName, members],
  );

  const patch = useCallback(
    async (item: HubItem, change: PostPatch) => {
      const assignee = change.assignee_id !== undefined ? members.find((m) => m.id === change.assignee_id) : undefined;
      const previous = applyLocal((items) =>
        items.map((i) =>
          i.id !== item.id
            ? i
            : {
                ...i,
                ...change,
                assignee_id: change.assignee_id !== undefined ? change.assignee_id : i.assignee_id,
                assignee_name:
                  change.assignee_id !== undefined
                    ? assignee ? `${assignee.first_name} ${assignee.last_name}` : null
                    : i.assignee_name,
              },
        ),
      );
      try {
        await updateItem({
          id: item.id,
          title: change.title ?? null,
          content: change.content ?? null,
          link_url: change.link_url ?? null,
          is_pinned: change.is_pinned ?? null,
          is_done: change.is_done ?? null,
          assignee_id: change.assignee_id ?? null,
          clear_assignee: change.assignee_id === null ? true : null,
        });
        await refetch();
      } catch (error) {
        restore(previous);
        toast.error("Couldn't update: " + errorText(error));
      }
    },
    [applyLocal, restore, refetch, updateItem, members],
  );

  const confirmDelete = useCallback(async () => {
    const item = pendingDelete;
    if (!item) return;
    setPendingDelete(null);
    const previous = applyLocal((items) => items.filter((i) => i.id !== item.id));
    try {
      await deleteItem({ id: item.id });
      toast.success("Post deleted");
      await refetch();
    } catch (error) {
      restore(previous);
      toast.error("Couldn't delete: " + errorText(error));
    }
  }, [pendingDelete, applyLocal, restore, refetch, deleteItem]);

  return {
    adding,
    add,
    patch,
    requestDelete: setPendingDelete,
    pendingDelete,
    cancelDelete: () => setPendingDelete(null),
    confirmDelete,
  };
}

export type HubPostActions = ReturnType<typeof useHubPosts>;
