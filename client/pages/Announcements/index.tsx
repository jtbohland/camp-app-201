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

export default function AnnouncementsPage() {
  const user = useSuperblocksUser();
  const [showCreate, setShowCreate] = useState(false);

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;
  const isAdmin = user?.email === "jt.bohland@amplitude.com";

  const { data, loading, fetching, refetch } = useApiData("GetAnnouncements", {});

  const announcements = data?.announcements ?? [];

  if (loadingCamper || loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Icon icon="megaphone" className="w-6 h-6 text-amber-400" />
            Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Important updates from your counselors
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-amber-600 hover:bg-amber-700">
            <Icon icon={showCreate ? "x" : "plus"} className="w-4 h-4 mr-1.5" />
            {showCreate ? "Cancel" : "Post"}
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateAnnouncementForm
          camperId={camperId}
          onSuccess={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}

      {/* Announcements feed */}
      <div className={`space-y-3 ${fetching ? "opacity-70" : ""}`}>
        {announcements.length === 0 ? (
          <Card className="p-8 text-center">
            <Icon icon="bell-off" className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground mt-2">No announcements yet</p>
          </Card>
        ) : (
          announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} />
          ))
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
  const priorityIcons: Record<string, string> = {
    normal: "info",
    important: "alert-triangle",
    urgent: "alert-circle",
  };

  return (
    <Card className={`p-5 ${priorityStyles[announcement.priority] ?? ""}`}>
      <div className="flex items-start gap-3">
        {announcement.pinned && (
          <Icon icon="pin" className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {announcement.priority !== "normal" && (
              <Icon
                icon={priorityIcons[announcement.priority] as any}
                className={`w-4 h-4 ${announcement.priority === "urgent" ? "text-red-400" : "text-amber-400"}`}
              />
            )}
            <h3 className="text-sm font-semibold text-foreground">{announcement.title}</h3>
          </div>
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{announcement.body}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
            {announcement.author_name && (
              <span className="flex items-center gap-1">
                <Icon icon="user" className="w-3 h-3" />
                {announcement.author_name}
              </span>
            )}
            <span>
              {new Date(announcement.created_at).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
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
    <Card className="p-5 border-amber-700/30 bg-amber-900/10">
      <h3 className="text-sm font-semibold text-foreground mb-4">New Announcement</h3>
      <div className="space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="bg-muted/30" />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your announcement..."
          className="bg-muted/30 min-h-[100px]"
        />
        <div className="flex items-center gap-3">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-36 h-8 text-xs">
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              pinned ? "bg-amber-600/20 text-amber-400 border border-amber-600/40" : "bg-muted text-muted-foreground"
            }`}
          >
            <Icon icon="pin" className="w-3 h-3" />
            {pinned ? "Pinned" : "Pin"}
          </button>
        </div>
        <Button onClick={handleSubmit} disabled={loading || !title.trim() || !body.trim()} className="bg-amber-600 hover:bg-amber-700">
          {loading ? "Posting..." : "Post Announcement"}
        </Button>
      </div>
    </Card>
  );
}
