import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export type Speaker = {
  id: number;
  name: string;
  title: string;
  photo_url: string | null;
  bio: string | null;
  linkedin_url: string | null;
};

/** Who's speaking: photo, title, LinkedIn and bio, shown above the live Q&A. */
export default function SpeakerHeader({ speaker }: { speaker: Speaker }) {
  return (
    <Card className="p-5 flex flex-col sm:flex-row gap-5 items-start">
      <div className="w-28 h-28 shrink-0 rounded-full overflow-hidden bg-muted shadow-md flex items-center justify-center">
        {speaker.photo_url ? (
          <img src={speaker.photo_url} alt={speaker.name} className="w-full h-full object-cover object-[center_25%]" />
        ) : (
          <Icon icon="circle-user" className="w-14 h-14 text-muted-foreground opacity-40" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold text-foreground">{speaker.name}</h2>
        <p className="text-sm text-muted-foreground">{speaker.title}</p>
        {speaker.linkedin_url && (
          <a
            href={speaker.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline mt-1.5"
          >
            <Icon icon="external-link" className="w-3.5 h-3.5" />
            LinkedIn Profile
          </a>
        )}
        {speaker.bio && (
          <p className="text-sm text-foreground/80 mt-3 whitespace-pre-line">{speaker.bio}</p>
        )}
      </div>
    </Card>
  );
}
