import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser, queryClient } from "@superblocksteam/library";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import AnnouncementCard, { type Announcement } from "./AnnouncementCard";
import AnnouncementForm, { type AnnouncementDraft, type Priority } from "./AnnouncementForm";
import DeleteAnnouncementDialog from "./DeleteAnnouncementDialog";

type FeedData = { announcements: Announcement[] };
const FEED_INPUTS = {};

function errorMessage(err: unknown): string {
  return err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err);
}

function asPriority(p: string): Priority {
  return p === "important" || p === "urgent" ? p : "normal";
}

export default function AnnouncementsFeed() {
  const user = useSuperblocksUser();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Announcement | null>(null);

  const { data: camperData } = useApiData("GetCurrentCamper", { email: user?.email ?? "" }, { enabled: !!user?.email });
  const camperId = camperData?.camper?.id ?? 0;
  const { isAdmin } = useIsAdmin();

  const { data, loading, fetching, refetch } = useApiData("GetAnnouncements", FEED_INPUTS);
  const announcements: Announcement[] = data?.announcements ?? [];

  const { run: createAnnouncement, loading: creating } = useApi("CreateAnnouncement");
  const { run: updateAnnouncement, loading: updating } = useApi("UpdateAnnouncement");
  const { run: deleteAnnouncement } = useApi("DeleteAnnouncement");

  /** Changes the cached feed right away; returns the previous feed so a failure can put it back. */
  const patchFeed = useCallback((change: (list: Announcement[]) => Announcement[]) => {
    const key = queryClient.buildCacheKey("GetAnnouncements", FEED_INPUTS);
    const previous = queryClient.getQueryData<FeedData>(key);
    if (previous) queryClient.setQueryData<FeedData>(key, { ...previous, announcements: change(previous.announcements) });
    return () => { if (previous) queryClient.setQueryData<FeedData>(key, previous); };
  }, []);

  const handleCreate = useCallback(async (draft: AnnouncementDraft) => {
    try {
      const result = await createAnnouncement({ ...draft, created_by: camperId });
      if (result?.success) {
        toast.success("Announcement posted!");
        setShowCreate(false);
        refetch();
      }
    } catch (err) {
      toast.error("Error: " + errorMessage(err));
    }
  }, [createAnnouncement, camperId, refetch]);

  const handleUpdate = useCallback(async (id: number, draft: AnnouncementDraft) => {
    const restore = patchFeed((list) => list.map((a) => (a.id === id ? { ...a, ...draft } : a)));
    try {
      await updateAnnouncement({ announcement_id: id, ...draft });
      setEditingId(null);
      toast.success("Announcement updated");
      await refetch();
    } catch (err) {
      restore();
      toast.error("Couldn't update: " + errorMessage(err));
    }
  }, [patchFeed, updateAnnouncement, refetch]);

  const handleDelete = useCallback(async () => {
    const target = deleting;
    if (!target) return;
    setDeleting(null);
    const restore = patchFeed((list) => list.filter((a) => a.id !== target.id));
    try {
      await deleteAnnouncement({ announcement_id: target.id });
      toast.success("Announcement deleted");
      await refetch();
    } catch (err) {
      restore();
      toast.error("Couldn't delete: " + errorMessage(err));
    }
  }, [deleting, patchFeed, deleteAnnouncement, refetch]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <Button onClick={() => setShowCreate(!showCreate)} size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-xs">
          <Icon icon={showCreate ? "x" : "plus"} className="w-3.5 h-3.5 mr-1" />
          {showCreate ? "Cancel" : "Post Announcement"}
        </Button>
      )}

      {showCreate && (
        <AnnouncementForm submitLabel="Post" savingLabel="Posting..." saving={creating} onSubmit={handleCreate} />
      )}

      <div className={`space-y-2 max-h-[400px] overflow-auto ${fetching ? "opacity-70" : ""}`}>
        {announcements.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Icon icon="bell-off" className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs mt-1">No announcements yet</p>
          </div>
        ) : (
          announcements.slice(0, 5).map((a) =>
            editingId === a.id ? (
              <AnnouncementForm
                key={a.id}
                initial={{ title: a.title, body: a.body, priority: asPriority(a.priority), pinned: a.pinned }}
                submitLabel="Save"
                savingLabel="Saving..."
                saving={updating}
                onSubmit={(draft) => handleUpdate(a.id, draft)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                canManage={isAdmin}
                onEdit={() => setEditingId(a.id)}
                onDelete={() => setDeleting(a)}
              />
            )
          )
        )}
        {announcements.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">+{announcements.length - 5} more</p>
        )}
      </div>

      <DeleteAnnouncementDialog
        title={deleting?.title ?? null}
        open={deleting !== null}
        onCancel={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
