import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";

export default function GalleryPage() {
  const user = useSuperblocksUser();
  const [dayFilter, setDayFilter] = useState<string>("all");
  const [showAdd, setShowAdd] = useState(false);

  const { data: camperData, loading: loadingCamper } = useApiData("GetCurrentCamper", {
    email: user?.email ?? "",
  }, { enabled: !!user?.email });

  const camperId = camperData?.camper?.id ?? 0;

  const { data, loading, fetching, refetch } = useApiData("GetGallery", {
    day_number: dayFilter === "all" ? null : Number(dayFilter),
  });

  const photos = data?.photos ?? [];

  if (loadingCamper || loading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Icon icon="camera" className="w-6 h-6 text-amber-400" />
            Camp Memories
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {photos.length} photo{photos.length !== 1 ? "s" : ""} shared
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dayFilter} onValueChange={setDayFilter}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Days</SelectItem>
              {[1, 2, 3, 4, 5].map((d) => (
                <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-amber-600 hover:bg-amber-700">
            <Icon icon={showAdd ? "x" : "plus"} className="w-4 h-4 mr-1.5" />
            {showAdd ? "Cancel" : "Add Photo"}
          </Button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <AddPhotoForm camperId={camperId} onSuccess={() => { setShowAdd(false); refetch(); }} />
      )}

      {/* Photo grid */}
      <div className={`${fetching ? "opacity-70" : ""}`}>
        {photos.length === 0 ? (
          <Card className="p-12 text-center">
            <Icon icon="image" className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mt-3">No photos yet — capture the moments!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <PhotoCard key={photo.id} photo={photo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoCard({ photo }: { photo: any }) {
  return (
    <Card className="overflow-hidden group">
      <div className="aspect-square bg-muted relative">
        <img
          src={photo.image_url}
          alt={photo.caption ?? "Camp photo"}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <div className="text-white">
            {photo.caption && (
              <p className="text-xs font-medium line-clamp-2">{photo.caption}</p>
            )}
            <p className="text-[10px] text-white/70 mt-0.5">
              {photo.uploaded_by_name} • Day {photo.day_number ?? "?"}
            </p>
          </div>
        </div>
      </div>
      {photo.caption && (
        <div className="p-2.5">
          <p className="text-xs text-foreground line-clamp-1">{photo.caption}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{photo.uploaded_by_name}</p>
        </div>
      )}
    </Card>
  );
}

function AddPhotoForm({ camperId, onSuccess }: { camperId: number; onSuccess: () => void }) {
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [dayNumber, setDayNumber] = useState<string>("1");
  const { run: addPhoto, loading } = useApi("AddGalleryPhoto");

  const handleSubmit = useCallback(async () => {
    if (!imageUrl.trim()) {
      toast.error("Image URL is required");
      return;
    }
    try {
      const result = await addPhoto({
        image_url: imageUrl.trim(),
        caption: caption.trim() || null,
        day_number: dayNumber ? Number(dayNumber) : null,
        uploaded_by: camperId,
      });
      if (result?.success) {
        toast.success("Photo added!");
        onSuccess();
      }
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : String(err);
      toast.error("Error: " + message);
    }
  }, [imageUrl, caption, dayNumber, camperId, addPhoto, onSuccess]);

  return (
    <Card className="p-5 border-amber-700/30 bg-amber-900/10">
      <h3 className="text-sm font-semibold text-foreground mb-3">Add Photo</h3>
      <div className="grid gap-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Image URL</label>
          <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className="bg-muted/30" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Caption</label>
            <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Describe the moment" className="bg-muted/30" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Day</label>
            <Select value={dayNumber} onValueChange={setDayNumber}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((d) => (
                  <SelectItem key={d} value={d.toString()}>Day {d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading || !imageUrl.trim()} className="bg-amber-600 hover:bg-amber-700">
          {loading ? "Adding..." : "Add Photo"}
        </Button>
      </div>
    </Card>
  );
}
