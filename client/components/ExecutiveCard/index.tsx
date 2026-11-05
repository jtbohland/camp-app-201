import { Icon } from "@/components/ui/icon";
import { getSpeakerMissing, type Executive } from "@/lib/speakers.js";

type ExecutiveCardProps = {
  executive: Executive;
  isAdmin: boolean;
  onEdit: (exec: Executive) => void;
  /** The signed-in guest speaker's own tile. */
  isMine?: boolean;
};

export default function ExecutiveCard({ executive, isAdmin, onEdit, isMine = false }: ExecutiveCardProps) {
  const missing = isAdmin ? getSpeakerMissing(executive) : [];
  const incompleteFields = missing.filter((m) => m !== "share link not copied");

  return (
    <div
      className={`relative flex flex-col items-center text-center bg-card border rounded-xl shadow-sm hover:shadow-md transition-shadow ${
        isMine ? "border-primary ring-2 ring-primary/30" : "border-border"
      }`}
    >
      {/* Counselor-only setup status */}
      {isAdmin && missing.length > 0 && (
        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {incompleteFields.length > 0 && (
            <span
              title={`Missing: ${missing.join(", ")}`}
              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700"
            >
              <Icon icon="circle-alert" className="h-3 w-3" />
              Incomplete
            </span>
          )}
          {!executive.link_copied_at && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
              <Icon icon="link" className="h-3 w-3" />
              Not shared yet
            </span>
          )}
        </div>
      )}
      {isMine && (
        <span className="absolute top-2 left-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
          You
        </span>
      )}

      {/* Round headshot: small enough that photos stay sharp, centered on the face */}
      <div className="pt-6">
        <div className="w-36 h-36 rounded-full overflow-hidden bg-muted ring-4 ring-background shadow-md flex items-center justify-center">
          {executive.photo_url ? (
            <img src={executive.photo_url} alt={executive.name} loading="lazy" className="w-full h-full object-cover object-[center_25%]" />
          ) : (
            <Icon icon="circle-user" className="w-16 h-16 text-muted-foreground opacity-40" />
          )}
        </div>
      </div>
      {isAdmin && (
        <button
          type="button"
          title="Edit speaker & share link"
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

        {executive.bio && <p className="text-sm text-foreground/80 line-clamp-3">{executive.bio}</p>}

        <SpeakerContactLinks executive={executive} />
      </div>
    </div>
  );
}

/** Slack name, email and LinkedIn, so cAMPers can reach the speaker. */
export function SpeakerContactLinks({ executive }: { executive: Executive }) {
  if (!executive.slack_name && !executive.email && !executive.linkedin_url) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-1 text-xs">
      {executive.slack_name && (
        <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
          <Icon icon="at-sign" className="w-3.5 h-3.5 text-muted-foreground" />
          {executive.slack_name}
          <span className="text-muted-foreground font-normal">on Slack</span>
        </span>
      )}
      {executive.email && (
        <a
          href={`mailto:${executive.email}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Icon icon="mail" className="w-3.5 h-3.5" />
          Email
        </a>
      )}
      {executive.linkedin_url && (
        <a
          href={executive.linkedin_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
        >
          <Icon icon="external-link" className="w-3.5 h-3.5" />
          LinkedIn
        </a>
      )}
    </div>
  );
}
