import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { toast } from "sonner";
import type { IconName } from "lucide-react/dynamic";
import EasterEggTrivia from "@/components/EasterEggTrivia/index.js";

type Link = { label: string; url: string };
type ContentItem = {
  id: number;
  tab: string | null;
  sort_order: number;
  icon: string;
  title: string;
  content: string;
  tip: string | null;
  links: Link[];
};

const TAB_META: { key: string; label: string; icon: IconName }[] = [
  { key: "rules", label: "Rules", icon: "shield" },
  { key: "budget", label: "Budget", icon: "credit-card" },
  { key: "travel", label: "Travel", icon: "plane" },
  { key: "hotels", label: "Hotels", icon: "building" },
  { key: "office", label: "Office", icon: "map-pin" },
];

type Props = {
  isAdmin?: boolean;
  camperId?: number;
};

export default function KnowBeforeYouGo({ isAdmin, camperId }: Props) {
  const [activeTab, setActiveTab] = useState("rules");
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data, loading, refetch } = useApiData("GetJourneyContent", {
    section: "know_before_you_go",
    camper_id: null,
  });

  const items = useMemo(() => {
    return ((data?.items ?? []) as any[]).map((item: any) => ({
      ...item,
      links: Array.isArray(item.links) ? item.links : [],
    })) as ContentItem[];
  }, [data]);

  const itemsByTab = useMemo(() => {
    const map: Record<string, ContentItem[]> = {};
    items.forEach((item) => {
      const tab = item.tab ?? "other";
      if (!map[tab]) map[tab] = [];
      map[tab].push(item);
    });
    return map;
  }, [items]);

  if (loading) {
    return (
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Icon icon="book-open" className="w-5 h-5 text-camp-green" />
        Know Before You Go
      </h2>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-4">
          {TAB_META.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs gap-1">
              <Icon icon={tab.icon} className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_META.map((tab) => (
          <TabsContent key={tab.key} value={tab.key}>
            {tab.key === "office" && camperId && <EasterEggTrivia camperId={camperId} />}
            {tab.key === "office" && <FloorMaps />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(itemsByTab[tab.key] ?? []).map((item) => (
                editingId === item.id ? (
                  <EditCard key={item.id} item={item} onSave={() => { setEditingId(null); refetch(); }} onCancel={() => setEditingId(null)} />
                ) : (
                  <InfoCard key={item.id} item={item} isAdmin={isAdmin} onEdit={() => setEditingId(item.id)} />
                )
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}

function InfoCard({ item, isAdmin, onEdit }: { item: ContentItem; isAdmin?: boolean; onEdit: () => void }) {
  const links = item.links;

  return (
    <div className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 relative group">
      <div className="text-camp-green mt-0.5 flex-shrink-0">
        <Icon icon={item.icon as IconName} className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.content}</p>
        {links.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"
              >
                <Icon icon="external-link" className="w-2.5 h-2.5" />
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
      {isAdmin && (
        <button
          onClick={onEdit}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
          title="Edit"
        >
          <Icon icon="pencil" className="w-3 h-3 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

function EditCard({ item, onSave, onCancel }: { item: ContentItem; onSave: () => void; onCancel: () => void }) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [tip, setTip] = useState(item.tip ?? "");
  const [icon, setIcon] = useState(item.icon);
  const [links, setLinks] = useState<Link[]>(item.links);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const { run: updateContent, loading } = useApi("UpdateJourneyContent");

  const addLink = useCallback(() => {
    if (!newUrl.trim()) return;
    setLinks((prev) => [...prev, { label: newLabel.trim() || newUrl.trim(), url: newUrl.trim() }]);
    setNewLabel("");
    setNewUrl("");
  }, [newLabel, newUrl]);

  const removeLink = useCallback((idx: number) => {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await updateContent({
        id: item.id,
        title: title.trim(),
        content: content.trim(),
        tip: tip.trim() || null,
        icon,
        links: JSON.stringify(links),
      });
      toast.success("Updated!");
      onSave();
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [item.id, title, content, tip, icon, links, updateContent, onSave]);

  return (
    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 col-span-full">
      <div className="grid gap-2">
        <div className="flex gap-2">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Icon" className="w-24 text-xs" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="flex-1 text-xs" />
        </div>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Content" rows={2} className="text-xs" />
        <Input value={tip} onChange={(e) => setTip(e.target.value)} placeholder="Tip (optional)" className="text-xs" />

        {/* Links editor */}
        {links.length > 0 && (
          <div className="space-y-1">
            {links.map((l, i) => (
              <div key={i} className="flex items-center gap-1 text-xs bg-muted/30 rounded px-2 py-1">
                <span className="flex-1 truncate">{l.label}: {l.url}</span>
                <button onClick={() => removeLink(i)} className="text-destructive"><Icon icon="x" className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-1">
          <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Link label" className="text-xs flex-1" />
          <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="text-xs flex-[2]" />
          <Button size="sm" variant="outline" onClick={addLink} disabled={!newUrl.trim()}><Icon icon="plus" className="w-3 h-3" /></Button>
        </div>

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={loading} className="text-xs">
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel} className="text-xs">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

/* ── Floor Maps Section (Office tab only) ── */
const FLOOR_MAPS = [
  {
    label: "2nd Floor",
    src: "/office/floor-2-map.webp",
    note: null,
  },
  {
    label: "3rd Floor",
    src: "/office/floor-3-map.webp",
    note: "We meet every day on the 3rd floor in AGENT SMITH (the room in the upper right hand corner, highlighted in red on the map).",
  },
] as const;

function FloorMaps() {
  const [expandedMap, setExpandedMap] = useState<typeof FLOOR_MAPS[number] | null>(null);

  return (
    <>
      {/* Maps grid */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon icon="map" className="w-4 h-4 text-camp-green" />
          <p className="text-sm font-medium">Office Floor Maps</p>
          <span className="text-[10px] text-muted-foreground">(click to enlarge)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {FLOOR_MAPS.map((map) => (
            <button
              key={map.label}
              onClick={() => setExpandedMap(map)}
              className="group relative rounded-lg overflow-hidden border border-border/50 hover:border-camp-green/50 transition-all cursor-zoom-in"
            >
              <img
                src={map.src}
                alt={`${map.label} Map`}
                className="w-full h-auto object-contain bg-white"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white rounded-full p-2">
                  <Icon icon="maximize-2" className="w-4 h-4" />
                </div>
              </div>
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <span className="text-white text-xs font-medium">{map.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Agent Smith callout */}
        <div className="mt-2 flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
          <span className="text-base flex-shrink-0">📍</span>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            <strong>Daily Meeting Room:</strong> We meet every day on the <strong>3rd floor</strong> in{" "}
            <strong>AGENT SMITH</strong> (the room in the upper right hand corner, highlighted in red on the 3rd floor map).
          </p>
        </div>
      </div>

      {/* Lightbox dialog */}
      <Dialog open={!!expandedMap} onOpenChange={() => setExpandedMap(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 overflow-auto">
          <DialogTitle className="text-sm font-semibold px-2 pt-1">
            {expandedMap?.label} Map
          </DialogTitle>
          {expandedMap && (
            <div className="flex flex-col gap-2">
              <img
                src={expandedMap.src}
                alt={`${expandedMap.label} Map`}
                className="w-full h-auto object-contain rounded bg-white"
              />
              {expandedMap.note && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                  <span className="text-base flex-shrink-0">📍</span>
                  <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">{expandedMap.note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
