import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import type { IconName } from "lucide-react/dynamic";

interface AgendaItem {
  id: number;
  title: string;
  session_type: string;
}

interface Resource {
  id: number;
  agenda_item_id: number;
  title: string;
  url: string;
  resource_type: string;
  description: string | null;
  added_by_name: string | null;
  created_at: string;
}

interface Props {
  agendaItems: AgendaItem[];
  isAdmin: boolean;
  camperId: number;
}

const RESOURCE_TYPE_ICONS: Record<string, IconName> = {
  link: "link",
  slides: "presentation",
  doc: "file-text",
  video: "play-circle",
  worksheet: "clipboard-list",
};

const RESOURCE_TYPE_COLORS: Record<string, string> = {
  link: "text-blue-400",
  slides: "text-amber-400",
  doc: "text-green-400",
  video: "text-purple-400",
  worksheet: "text-rose-400",
};

export default function AgendaResources({ agendaItems, isAdmin, camperId }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [resourceType, setResourceType] = useState<string>("link");
  const [description, setDescription] = useState("");

  const { data, loading, fetching, refetch } = useApiData("GetAgendaResources", {
    agenda_item_id: null,
  });
  const { run: addResource, loading: adding } = useApi("AddAgendaResource");

  const resources: Resource[] = (data?.resources ?? []) as Resource[];

  // Group resources by agenda item
  const grouped = agendaItems
    .filter((item) => item.session_type !== "lunch" && item.session_type !== "break")
    .map((item) => ({
      item,
      resources: resources.filter((r) => r.agenda_item_id === item.id),
    }))
    .filter((g) => g.resources.length > 0 || isAdmin);

  const handleAdd = useCallback(async () => {
    if (!selectedItemId || !title.trim() || !url.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const result = await addResource({
        agenda_item_id: Number(selectedItemId),
        title: title.trim(),
        url: url.trim(),
        resource_type: resourceType as "link" | "slides" | "doc" | "video" | "worksheet",
        description: description.trim() || null,
        added_by: camperId,
      });
      if (result?.success) {
        toast.success("Resource added!");
        setTitle("");
        setUrl("");
        setDescription("");
        setShowAdd(false);
        refetch();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [selectedItemId, title, url, resourceType, description, camperId, addResource, refetch]);

  if (loading) {
    return (
      <Card className="p-4 animate-pulse bg-muted/20 h-24" />
    );
  }

  // Don't show section if no resources and not admin
  if (!isAdmin && resources.length === 0) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon icon="folder-open" className="w-4 h-4 text-amber-400" />
          Session Resources
          {resources.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({resources.length})</span>
          )}
        </h3>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdd(!showAdd)}
            className="h-7 text-xs"
          >
            <Icon icon={showAdd ? "x" : "plus"} className="w-3 h-3 mr-1" />
            {showAdd ? "Cancel" : "Add Resource"}
          </Button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-4 rounded-lg border border-amber-700/30 bg-amber-900/10 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Session</label>
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select session..." />
                </SelectTrigger>
                <SelectContent>
                  {agendaItems
                    .filter((i) => i.session_type !== "lunch" && i.session_type !== "break")
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id.toString()}>
                        {item.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <Select value={resourceType} onValueChange={setResourceType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="slides">Slides</SelectItem>
                  <SelectItem value="doc">Document</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="worksheet">Worksheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Resource name" className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">URL</label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Description (optional)</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description" className="h-8 text-xs" />
          </div>
          <Button onClick={handleAdd} disabled={adding || !selectedItemId || !title.trim() || !url.trim()} size="sm" className="bg-amber-600 hover:bg-amber-700 text-xs">
            {adding ? "Adding..." : "Add Resource"}
          </Button>
        </div>
      )}

      {/* Resources list grouped by session */}
      <div className={`space-y-3 ${fetching ? "opacity-70" : ""}`}>
        {grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No resources added yet. {isAdmin ? "Click \"Add Resource\" to attach materials." : ""}
          </p>
        ) : (
          grouped.map(({ item, resources: itemResources }) => (
            <div key={item.id}>
              {itemResources.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">{item.title}</p>
                  {itemResources.map((r) => (
                    <a
                      key={r.id}
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/30 transition-colors group"
                    >
                      <Icon
                        icon={RESOURCE_TYPE_ICONS[r.resource_type] ?? "link"}
                        className={`w-4 h-4 ${RESOURCE_TYPE_COLORS[r.resource_type] ?? "text-blue-400"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground group-hover:text-amber-400 transition-colors truncate block">
                          {r.title}
                        </span>
                        {r.description && (
                          <span className="text-[10px] text-muted-foreground truncate block">{r.description}</span>
                        )}
                      </div>
                      <Icon icon="external-link" className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
