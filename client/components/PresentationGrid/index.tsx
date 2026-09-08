import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

type Presentation = {
  id: number;
  title: string;
  description: string | null;
  team_name: string | null;
  day_number: number | null;
  status: string;
  prep_time_minutes: number | null;
  present_time_minutes: number | null;
  feedback_count: number;
  avg_rating: string | null;
};

type Props = {
  presentations: Presentation[];
  onSelect: (id: number) => void;
};

const STATUS_CONFIG: Record<string, { icon: IconName; label: string; color: string }> = {
  upcoming: { icon: "clock", label: "Upcoming", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  in_progress: { icon: "play", label: "Live", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  completed: { icon: "check-circle", label: "Done", color: "text-muted-foreground bg-muted/30 border-border" },
};

export default function PresentationGrid({ presentations, onSelect }: Props) {
  if (presentations.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Icon icon="presentation" className="w-16 h-16 mx-auto text-muted-foreground/20" />
        <h2 className="text-lg font-semibold mt-4 text-foreground">No Presentations Yet</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Presentation tiles will appear here once your counselor creates them.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {presentations.map((p) => (
        <PresentationTile key={p.id} presentation={p} onSelect={onSelect} />
      ))}
    </div>
  );
}

function PresentationTile({ presentation, onSelect }: { presentation: Presentation; onSelect: (id: number) => void }) {
  const status = STATUS_CONFIG[presentation.status] ?? STATUS_CONFIG.upcoming;

  return (
    <Card
      className="p-5 cursor-pointer hover:shadow-lg hover:border-purple-400/30 transition-all group relative overflow-hidden"
      onClick={() => onSelect(presentation.id)}
    >
      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${status.color}`}>
        <Icon icon={status.icon} className="w-3 h-3" />
        {status.label}
      </div>

      {/* Title & description */}
      <h3 className="text-base font-bold text-foreground mt-3 group-hover:text-purple-400 transition-colors line-clamp-2">
        {presentation.title}
      </h3>
      {presentation.description && (
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{presentation.description}</p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-muted-foreground">
        {presentation.team_name && (
          <span className="flex items-center gap-1">
            <Icon icon="users" className="w-3 h-3" />
            {presentation.team_name}
          </span>
        )}
        {presentation.day_number && (
          <span className="flex items-center gap-1">
            <Icon icon="calendar" className="w-3 h-3" />
            Day {presentation.day_number}
          </span>
        )}
        {presentation.present_time_minutes && (
          <span className="flex items-center gap-1">
            <Icon icon="timer" className="w-3 h-3" />
            {presentation.present_time_minutes}m
          </span>
        )}
      </div>

      {/* Feedback stats */}
      {presentation.feedback_count > 0 && (
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border text-xs">
          <span className="flex items-center gap-1 text-amber-400">
            <Icon icon="star" className="w-3 h-3" />
            {presentation.avg_rating ?? "—"}
          </span>
          <span className="text-muted-foreground">
            {presentation.feedback_count} feedback{presentation.feedback_count > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Hover arrow */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <Icon icon="arrow-right" className="w-4 h-4 text-purple-400" />
      </div>
    </Card>
  );
}
