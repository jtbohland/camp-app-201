import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

type Presentation = {
  id: number;
  title: string;
  description: string | null;
  day_number: number | null;
  status: string;
  prep_time_minutes: number | null;
  present_time_minutes: number | null;
  sort_order: number;
  is_locked: boolean;
  feedback_count: number;
  avg_rating: string | null;
  questions?: any[];
};

type Props = {
  presentations: Presentation[];
  onSelect: (id: number) => void;
  isAdmin?: boolean;
};

const STATUS_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  upcoming: { icon: "clock", label: "Upcoming", color: "text-blue-400 bg-blue-400/10 border-blue-400/30" },
  in_progress: { icon: "play", label: "Live", color: "text-green-400 bg-green-400/10 border-green-400/30" },
  completed: { icon: "check-circle", label: "Done", color: "text-muted-foreground bg-muted/30 border-border" },
};

const DAY_LABELS: Record<number, string> = {
  1: "Day 1 — Monday",
  2: "Day 2 — Tuesday",
  3: "Day 3 — Wednesday",
  4: "Day 4 — Thursday",
  5: "Day 5 — Friday",
};

export default function PresentationGrid({ presentations, onSelect, isAdmin = false }: Props) {
  if (presentations.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Icon icon="presentation" className="w-16 h-16 mx-auto text-muted-foreground/20" />
        <p className="text-lg font-medium mt-4 text-muted-foreground">No presentations yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Counselors will add them from the Hub.</p>
      </Card>
    );
  }

  // Group by day, sorted by day_number then sort_order
  const sorted = [...presentations].sort((a, b) => {
    const dayA = a.day_number ?? 99;
    const dayB = b.day_number ?? 99;
    if (dayA !== dayB) return dayA - dayB;
    return a.sort_order - b.sort_order;
  });

  const dayGroups = new Map<number, Presentation[]>();
  for (const p of sorted) {
    const day = p.day_number ?? 0;
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(p);
  }

  return (
    <div className="space-y-8">
      {Array.from(dayGroups.entries()).map(([day, items]) => (
        <div key={day}>
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Icon icon="calendar" className="w-4 h-4" />
            {DAY_LABELS[day] ?? (day === 0 ? "General" : `Day ${day}`)}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((p, idx) => (
              <PresentationTile
                key={p.id}
                presentation={p}
                onSelect={onSelect}
                isAdmin={isAdmin}
                orderNum={idx + 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PresentationTile({ presentation, onSelect, isAdmin, orderNum }: {
  presentation: Presentation;
  onSelect: (id: number) => void;
  isAdmin: boolean;
  orderNum: number;
}) {
  const status = STATUS_CONFIG[presentation.status] ?? STATUS_CONFIG.upcoming;
  const isLocked = presentation.is_locked && !isAdmin;
  const hasQuestions = Array.isArray(presentation.questions) && presentation.questions.length > 0;

  return (
    <Card
      className={`p-5 transition-all group relative overflow-hidden ${
        isLocked ? "opacity-60" : "hover:shadow-md cursor-pointer"
      }`}
      onClick={isLocked ? undefined : () => onSelect(presentation.id)}
    >
      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm z-10 flex items-center justify-center">
          <div className="text-center">
            <Icon icon="lock" className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground mt-1">Coming Soon</p>
          </div>
        </div>
      )}

      {/* Order number */}
      <div className="flex items-start justify-between mb-3">
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
          {orderNum}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
        {presentation.title}
      </h3>

      {/* Description */}
      {presentation.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{presentation.description}</p>
      )}

      {/* Meta */}
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        {presentation.prep_time_minutes != null && presentation.prep_time_minutes > 0 && (
          <span className="flex items-center gap-1">
            <Icon icon="clock" className="w-3 h-3" />
            {presentation.prep_time_minutes}m prep
          </span>
        )}
        {presentation.present_time_minutes != null && presentation.present_time_minutes > 0 && (
          <span className="flex items-center gap-1">
            <Icon icon="timer" className="w-3 h-3" />
            {presentation.present_time_minutes}m present
          </span>
        )}
        {hasQuestions && (
          <span className="flex items-center gap-1 text-camp-green">
            <Icon icon="edit-3" className="w-3 h-3" />
            Interactive
          </span>
        )}
        {presentation.feedback_count > 0 && (
          <span className="flex items-center gap-1">
            <Icon icon="message-circle" className="w-3 h-3" />
            {presentation.feedback_count}
          </span>
        )}
      </div>
    </Card>
  );
}
