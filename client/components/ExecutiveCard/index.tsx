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
    <div className="flex flex-col bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative h-48 bg-muted flex items-center justify-center overflow-hidden">
        {executive.photo_url ? (
          <img
            src={executive.photo_url}
            alt={executive.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Icon icon="circle-user" className="w-16 h-16 opacity-40" />
          </div>
        )}
        {isAdmin && (
          <button
            onClick={() => onEdit(executive)}
            className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-md text-muted-foreground hover:text-foreground transition-colors"
          >
            <Icon icon="pencil" className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-2 p-4">
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
