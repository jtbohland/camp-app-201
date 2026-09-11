import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import MemoryCard from "@/components/MemoryCard";

export default function MemoriesTab() {
  const user = useSuperblocksUser();
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);

  const { data: camperData } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;

  const { data, loading, fetching, refetch } = useApiData("GetMemories", {
    day_filter: dayFilter === "all" ? null : Number(dayFilter),
    viewer_camper_id: camperId || null,
  }, { enabled: camperId > 0 });

  // Also get legacy gallery photos
  const { data: galleryData } = useApiData("GetGallery", {
    day_number: dayFilter === "all" ? null : Number(dayFilter),
  });

  const memories = data?.memories ?? [];
  const galleryPhotos = galleryData?.photos ?? [];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
      </div>
    );
  }

  const totalCount = memories.length + galleryPhotos.length;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header + Controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {totalCount} memor{totalCount !== 1 ? "ies" : "y"} shared
        </p>
        <div className="flex items-center gap-3">
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-28 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {[1, 2, 3, 4, 5].map((d) => (
                <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(!showAdd)} size="sm" className="bg-amber-600 hover:bg-amber-700">
            <Icon icon={showAdd ? "x" : "plus"} className="w-4 h-4 mr-1.5" />
            {showAdd ? "Cancel" : "Share"}
          </Button>
        </div>
      </div>

      {/* Add Memory Form */}
      {showAdd && (
        <AddMemoryForm
          camperId={camperId}
          onSuccess={() => { setShowAdd(false); refetch(); }}
        />
      )}

      {/* Feed */}
      <div className={`space-y-4 ${fetching ? "opacity-70" : ""}`}>
        {fetching && <p className="text-xs text-muted-foreground">Updating…</p>}

        {/* New memories from camp201_memories */}
        {memories.map((m: any) => (
          <MemoryCard key={`m-${m.id}`} memory={m} camperId={camperId} onReacted={refetch} />
        ))}

        {/* Legacy gallery photos (no reactions) */}
        {galleryPhotos.map((p: any) => (
          <Card key={`g-${p.id}`} className="p-4 bg-card border">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-emerald-700/30 flex items-center justify-center">
                <Icon icon="user" className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{p.uploaded_by_name}</p>
                <p className="text-[10px] text-muted-foreground">Day {p.day_number ?? "?"}</p>
              </div>
              <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                📸 Photo
              </span>
            </div>
            <div className="rounded-lg overflow-hidden mb-2">
              <img src={p.image_url} alt={p.caption ?? "Camp photo"} className="w-full max-h-80 object-cover" loading="lazy" />
            </div>
            {p.caption && <p className="text-xs text-muted-foreground">{p.caption}</p>}
          </Card>
        ))}

        {totalCount === 0 && (
          <Card className="p-12 text-center">
            <Icon icon="heart" className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mt-3">No memories yet — share your favorite moments!</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function AddMemoryForm({ camperId, onSuccess }: { camperId: number; onSuccess: () => void }) {
  const [mode, setMode] = useState<"text" | "photo">("text");
  const [text, setText] = useState("");
  const [imageData, setImageData] = useState("");
  const [caption, setCaption] = useState("");
  const [dayNumber, setDayNumber] = useState<string>("1");
  const { run: addMemory, loading } = useApi("AddMemory");

  const handleSubmit = useCallback(async () => {
    if (mode === "text" && text.trim().length < 5) {
      toast.error("Write at least a few words about your memory");
      return;
    }
    if (mode === "photo" && !imageData) {
      toast.error("Upload a photo first");
      return;
    }
    try {
      const result = await addMemory({
        camper_id: camperId,
        memory_type: mode,
        content: mode === "text" ? text.trim() : (caption.trim() || null),
        image_url: mode === "photo" ? imageData : null,
        day_number: dayNumber ? Number(dayNumber) : null,
      });
      if (result?.success) {
        if (result.badge_awarded) {
          toast.success("📸 KINDling badge earned! Thanks for sharing a photo.");
        } else {
          toast.success("Memory shared!");
        }
        onSuccess();
      }
    } catch (err) {
      const message = err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
      toast.error("Error: " + message);
    }
  }, [mode, text, imageData, caption, dayNumber, camperId, addMemory, onSuccess]);

  return (
    <Card className="p-5 border-amber-700/30 bg-amber-900/10">
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === "text" ? "bg-blue-600 text-white" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <Icon icon="pen-line" className="w-3 h-3" /> Write Memory
        </button>
        <button
          onClick={() => setMode("photo")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            mode === "photo" ? "bg-rose-600 text-white" : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
          }`}
        >
          <Icon icon="camera" className="w-3 h-3" /> Upload Photo
        </button>
      </div>

      {mode === "text" ? (
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your favorite memory from cAMP…"
            className="bg-muted/30 min-h-[80px] resize-none"
            maxLength={500}
          />
          <p className="text-[10px] text-muted-foreground text-right">{text.length}/500</p>
        </div>
      ) : (
        <div className="space-y-3">
          <ImageUpload
            value={imageData}
            onChange={setImageData}
            label=""
            hint="Drag & drop or click (PNG, JPG, GIF, WebP — max 5MB)"
            shape="square"
            maxSizeMB={5}
          />
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            className="bg-muted/30"
          />
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <Select value={dayNumber} onValueChange={setDayNumber}>
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((d) => (
              <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={handleSubmit}
          disabled={loading || (mode === "text" ? text.trim().length < 5 : !imageData)}
          size="sm"
          className="bg-amber-600 hover:bg-amber-700"
        >
          {loading ? "Sharing..." : mode === "text" ? "Share Memory" : "Upload Photo"}
        </Button>
      </div>
    </Card>
  );
}
