import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";

type HubItem = {
  id: number;
  team_id: number;
  author_id: number;
  author_name: string;
  section: string;
  item_type: string;
  title: string;
  content: string | null;
  created_at: string;
  updated_at: string;
};

type SectionDef = {
  key: string;
  label: string;
  icon: string;
  description: string;
};

type HubSectionProps = {
  section: SectionDef;
  items: HubItem[];
  canContribute: boolean;
  teamId: number;
  camperId: number;
  onItemAdded: () => void;
  fetching: boolean;
};

const ITEM_TYPES = [
  { key: "note", label: "Note", icon: "📝" },
  { key: "idea", label: "Idea", icon: "💡" },
  { key: "resource", label: "Resource/Link", icon: "🔗" },
  { key: "doc", label: "Document/Slides", icon: "📄" },
];

export default function HubSection({ section, items, canContribute, teamId, camperId, onItemAdded, fetching }: HubSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("note");

  const { run: addItem, loading: adding } = useApi("AddHubItem");

  const handleAdd = useCallback(async () => {
    if (!newTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    try {
      await addItem({
        team_id: teamId,
        author_id: camperId,
        section: section.key,
        item_type: newType,
        title: newTitle.trim(),
        content: newContent.trim() || null,
      });
      toast.success("Added to hub!");
      setNewTitle("");
      setNewContent("");
      setShowAdd(false);
      onItemAdded();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Failed to add: " + message);
    }
  }, [newTitle, newContent, newType, teamId, camperId, section.key, addItem, onItemAdded]);

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{section.description}</p>
        </div>
        {canContribute && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          >
            + Add
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="border border-border rounded-lg p-4 bg-card/80">
          <div className="flex flex-col gap-3">
            {/* Type selector */}
            <div className="flex gap-2">
              {ITEM_TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setNewType(t.key)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    newType === t.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title…"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />

            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Content, notes, links, ideas… (supports plain text)"
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAdd(false); setNewTitle(""); setNewContent(""); }}
                className="px-3 py-1.5 text-sm text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !newTitle.trim()}
                className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {adding ? "Adding…" : "Add to Hub"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Items List */}
      <div className={`flex flex-col gap-3 ${fetching ? "opacity-70" : ""}`}>
        {items.length === 0 && !showAdd ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/10">
            <p className="text-muted-foreground text-sm">No items in this section yet</p>
            {canContribute && (
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to contribute — add notes, ideas, or resources!
              </p>
            )}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="border border-border rounded-lg p-4 bg-card hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{ITEM_TYPES.find((t) => t.key === item.item_type)?.icon ?? "📝"}</span>
                    <h3 className="font-medium text-foreground text-sm truncate">{item.title}</h3>
                  </div>
                  {item.content && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">{item.content}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">{item.author_name}</span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
