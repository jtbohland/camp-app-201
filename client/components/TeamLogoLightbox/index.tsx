import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Props = {
  /** Logo to show full size, or null to close. */
  logo: { src: string; name: string; color: string | null } | null;
  onClose: () => void;
};

/** Full-size view of a team logo, so small badges are easy to see. */
export default function TeamLogoLightbox({ logo, onClose }: Props) {
  return (
    <Dialog open={!!logo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg p-4">
        <DialogTitle className="text-base font-bold text-center">{logo?.name}</DialogTitle>
        <DialogDescription className="sr-only">Team logo, full size</DialogDescription>
        {logo && (
          <div
            className="mx-auto w-full max-w-md aspect-square rounded-2xl border-4 bg-white p-4 flex items-center justify-center"
            style={{ borderColor: logo.color ?? "#e5e7eb" }}
          >
            <img src={logo.src} alt={`${logo.name} logo`} className="max-w-full max-h-full object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
