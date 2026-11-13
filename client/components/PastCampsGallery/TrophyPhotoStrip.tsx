import { Icon } from "@/components/ui/icon";
import PhotoDropZone from "@/components/PhotoDropZone/index.js";

type Props = {
  teamName: string;
  photoUrl: string | null;
  /** Saved anchor (percent) so faces stay in frame when cropped. */
  focusX: number;
  focusY: number;
  accent: string;
  /** Counselors can drop a photo straight onto the tile. */
  canEdit: boolean;
  saving: boolean;
  onPhoto: (dataUrl: string) => void;
  onError: (message: string) => void;
};

/**
 * Champion tile: the trophy photo, always on display, in a band between the logo and the info.
 * For counselors with no photo yet, a slim drop target in the same spot.
 */
export default function TrophyPhotoStrip({ teamName, photoUrl, focusX, focusY, accent, canEdit, saving, onPhoto, onError }: Props) {
  if (!photoUrl && !canEdit) return null;

  const content = (dragging: boolean) =>
    photoUrl ? (
      <div className="relative aspect-[16/10] overflow-hidden bg-black">
        <img
          src={photoUrl}
          alt={`${teamName} with the trophy`}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          style={{ objectPosition: `${focusX}% ${focusY}%` }}
        />
        {/* Gold ribbon */}
        <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-md">
          <span>🏆</span> Trophy Moment
        </div>
        {canEdit && (
          <div className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-xs font-medium text-white transition-opacity ${dragging ? "opacity-100" : "opacity-0 hover:opacity-100"}`}>
            {saving ? <Icon icon="loader-circle" className="h-5 w-5 animate-spin" /> : (
              <>
                <span className="inline-flex items-center"><Icon icon="refresh-cw" className="mr-1.5 h-3.5 w-3.5" /> Drop or click to replace</span>
                <span className="text-[10px] text-white/70">Reposition in Counselor Hub · Legacy Photos</span>
              </>
            )}
          </div>
        )}
      </div>
    ) : (
      <div
        className={`flex items-center justify-center gap-2 border-y border-dashed px-3 py-3 text-xs transition-colors ${dragging ? "bg-amber-50" : "bg-amber-50/40 hover:bg-amber-50"}`}
        style={{ borderColor: `${accent}40`, color: accent }}
      >
        {saving ? <Icon icon="loader-circle" className="h-4 w-4 animate-spin" /> : <Icon icon="image-plus" className="h-4 w-4" />}
        <span className="font-semibold">Add trophy photo</span>
        <span className="opacity-70">· drop or click</span>
      </div>
    );

  if (!canEdit) return <div>{content(false)}</div>;
  return (
    <PhotoDropZone onPhoto={onPhoto} onError={onError} disabled={saving} maxSize={1600} className="block cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {({ dragging }) => content(dragging)}
    </PhotoDropZone>
  );
}
