import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";

export default function AnnouncementsFeed() {
  const user = useSuperblocksUser();
  const [showCreate, setShowCreate] = useState(false);

  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

  const { data, loading, fetching, refetch } = useApiData("GetAnnouncements", {});
  const announcements = data?.announcements ?? [];

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
        <Button
          onClick={() => setShowCreate(!showCreate)}
          size="sm"
          className="w-full bg-amber-600 hover:bg-amber-700 text-xs"
        >
          <Icon icon={showCreate ? "x" : "plus"} className="w-3.5 h-3.5 mr-1" />
          {showCreate ? "Cancel" : "Post Announcement"}
        </Button>
      )}

      {showCreate && (
        <CreateAnnouncementForm
          camperId={camperId}
          onSuccess={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}

      <div className={`space-y-2 max-h-[400px] overflow-auto ${fetching ? "opacity-70" : ""}`}>
        {announcements.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Icon icon="bell-off" className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs mt-1">No announcements yet</p>
          </div>
        ) : (
          announcements.slice(0, 5).map((a: any) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))
        )}
        {announcements.length > 5 && (
          <p className="text-xs text-muted-foreground text-center pt-1">
            +{announcements.length - 5} more
          </p>
        )}
      </div>
    </div>
  );
}

function AnnouncementCard({ announcement }: { announcement: any }) {
  const priorityStyles: Record<string, string> = {
    normal: "border-border",
    important: "border-amber-500/40 bg-amber-900/5",
    urgent: "border-red-500/40 bg-red-900/5",
  };

  return (
    <Card className={`p-3 ${priorityStyles[announcement.priority] ?? ""}`}>
      <div className="flex items-start gap-2">
        {announcement.pinned && (
          <Icon icon="pin" className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-foreground line-clamp-1">{announcement.title}</h4>
          <p className="text-[11px] text-foreground/70 mt-0.5 line-clamp-2">{announcement.body}</p>
          <span className="text-[10px] text-muted-foreground mt-1 block">
            {new Date(announcement.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </Card>
  );
}

function CreateAnnouncementForm({ camperId, onSuccess }: { camperId: number; onSuccess: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<string>("normal");
  const [pinned, setPinned] = useState(false);
  const { run: createAnnouncement, loading } = useApi("CreateAnnouncement");

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    try {
      const result = await createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        priority: priority as "normal" | "important" | "urgent",
        pinned,
        created_by: camperId,
      });
      if (result?.success) {
        toast.success("Announcement posted!");
        onSuccess();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [title, body, priority, pinned, camperId, createAnnouncement, onSuccess]);

  return (
    <Card className="p-3 border-amber-700/30 bg-amber-900/10">
      <div className="space-y-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="bg-muted/30 h-8 text-xs" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your announcement..."
          className="bg-muted/30 min-h-[60px] text-xs"
        />
        <div className="flex items-center gap-2">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-28 h-7 text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="important">Important</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={() => setPinned(!pinned)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] transition-colors ${
              pinned ? "bg-amber-600/20 text-amber-400 border border-amber-600/40" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon icon="pin" className="w-2.5 h-2.5" />
            Pin
          </button>
        </div>
        <Button onClick={handleSubmit} disabled={loading || !title.trim()} size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-xs h-7">
          {loading ? "Posting..." : "Post"}
        </Button>
      </div>
    </Card>
  );
}
