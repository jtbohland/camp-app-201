import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { SpeakerContactLinks } from "@/components/ExecutiveCard/index.js";
import type { Executive } from "@/lib/speakers.js";

export type Speaker = Executive;

/** Who's speaking: photo, title, Slack/email/LinkedIn and bio, shown above the live Q&A. */
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
        <div className="[&>div]:justify-start">
          <SpeakerContactLinks executive={speaker} />
        </div>
        {speaker.bio && <p className="text-sm text-foreground/80 mt-3 whitespace-pre-line">{speaker.bio}</p>}
      </div>
    </Card>
  );
}
