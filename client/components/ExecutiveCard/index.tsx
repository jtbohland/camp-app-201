import { Icon } from "@/components/ui/icon";

type Executive = {
  id: number;
  name: string;
  title: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
  is_active: boolean;
};

type ExecutiveCardProps = {
  executive: Executive;
  isAdmin: boolean;
  onEdit: (exec: Executive) => void;
};

export default function ExecutiveCard({ executive, isAdmin, onEdit }: ExecutiveCardProps) {
  return (
    <div className="relative flex flex-col items-center text-center bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* Round headshot: small enough that photos stay sharp, centered on the face */}
      <div className="pt-6">
        <div className="w-36 h-36 rounded-full overflow-hidden bg-muted ring-4 ring-background shadow-md flex items-center justify-center">
          {executive.photo_url ? (
            <img
              src={executive.photo_url}
              alt={executive.name}
              loading="lazy"
              className="w-full h-full object-cover object-[center_25%]"
            />
          ) : (
            <Icon icon="circle-user" className="w-16 h-16 text-muted-foreground opacity-40" />
          )}
        </div>
      </div>
        {isAdmin && (
          <button
            type="button"
            title="Edit speaker"
            aria-label={`Edit ${executive.name}`}
            onClick={(e) => {
              // Don't let the click reach the tile, which opens the Q&A page
              e.stopPropagation();
              onEdit(executive);
            }}
            className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon icon="pencil" className="w-3.5 h-3.5" />
          </button>
        )}

      {/* Info */}
      <div className="flex flex-col items-center gap-2 p-4 pt-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">{executive.name}</h3>
          <p className="text-sm text-muted-foreground">{executive.title}</p>
        </div>

        {executive.bio && (
          <p className="text-sm text-foreground/80 line-clamp-3">{executive.bio}</p>
        )}

        {executive.linkedin_url && (
          <a
            href={executive.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1"
          >
            <Icon icon="external-link" className="w-3.5 h-3.5" />
            LinkedIn Profile
          </a>
        )}
      </div>
    </div>
  );
}
