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
  presentation_type?: string | null;
};

type Props = {
  presentations: Presentation[];
  onSelect: (id: number) => void;
  isAdmin?: boolean;
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: string }> = {
  upcoming: { label: "Upcoming", bg: "bg-blue-500/10", text: "text-blue-500", icon: "clock" },
  in_progress: { label: "In Progress", bg: "bg-emerald-500/10", text: "text-emerald-500", icon: "play" },
  completed: { label: "Completed", bg: "bg-muted", text: "text-muted-foreground", icon: "check-circle" },
};

// Each day gets a unique accent color for its header + tile accents
const DAY_THEMES: Record<number, { label: string; gradient: string; accent: string; icon: string }> = {
  1: { label: "Day 1 — Monday", gradient: "from-amber-600 to-yellow-500", accent: "border-l-amber-500", icon: "🌅" },
  2: { label: "Day 2 — Tuesday", gradient: "from-emerald-700 to-green-500", accent: "border-l-emerald-500", icon: "🌿" },
  3: { label: "Day 3 — Wednesday", gradient: "from-sky-700 to-blue-500", accent: "border-l-sky-500", icon: "⛰️" },
  4: { label: "Day 4 — Thursday", gradient: "from-violet-700 to-purple-500", accent: "border-l-violet-500", icon: "🔥" },
  5: { label: "Day 5 — Friday", gradient: "from-rose-700 to-orange-500", accent: "border-l-rose-500", icon: "🏆" },
};

const DEFAULT_THEME = { label: "General", gradient: "from-stone-600 to-stone-400", accent: "border-l-stone-500", icon: "📋" };

export default function PresentationGrid({ presentations, onSelect, isAdmin = false }: Props) {
  if (presentations.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="text-4xl mb-3">🎤</div>
        <p className="text-lg font-medium text-muted-foreground">No presentations yet</p>
        <p className="text-sm text-muted-foreground/60 mt-1">Counselors will add them from the Hub.</p>
      </Card>
    );
  }

  // Group by day, sorted
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
    <div className="space-y-10">
      {Array.from(dayGroups.entries()).map(([day, items]) => {
        const theme = DAY_THEMES[day] ?? DEFAULT_THEME;
        return (
          <div key={day}>
            {/* Day header with gradient badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className={`bg-gradient-to-r ${theme.gradient} text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-sm`}>
                {theme.icon} {theme.label}
              </div>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? "activity" : "activities"}</span>
            </div>

            {/* Tiles grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((p, idx) => (
                <PresentationTile
                  key={p.id}
                  presentation={p}
                  onSelect={onSelect}
                  isAdmin={isAdmin}
                  orderNum={idx + 1}
                  dayTheme={theme}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PresentationTile({ presentation, onSelect, isAdmin, orderNum, dayTheme }: {
  presentation: Presentation;
  onSelect: (id: number) => void;
  isAdmin: boolean;
  orderNum: number;
  dayTheme: { accent: string; gradient: string };
}) {
  const status = STATUS_CONFIG[presentation.status] ?? STATUS_CONFIG.upcoming;
  const isLocked = presentation.is_locked && !isAdmin;
  const hasQuestions = Array.isArray(presentation.questions) && presentation.questions.length > 0;
  const isBingo = presentation.presentation_type === "bingo";
  const isTeamPres = presentation.presentation_type === "team_presentation";
  const totalQuestions = hasQuestions
    ? (presentation.questions as any[]).reduce((sum: number, s: any) => sum + (s.questions?.length ?? 0), 0)
    : 0;

  return (
    <Card
      className={`relative overflow-hidden transition-all border-l-4 ${dayTheme.accent} ${
        isLocked
          ? "opacity-50 grayscale"
          : "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
      }`}
      onClick={isLocked ? undefined : () => onSelect(presentation.id)}
    >
      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 bg-background/70 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-1.5">
              <Icon icon="lock" className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Coming Soon</p>
          </div>
        </div>
      )}

      {/* Top gradient strip */}
      <div className={`h-1.5 bg-gradient-to-r ${dayTheme.gradient}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${dayTheme.gradient} text-white flex items-center justify-center text-sm font-bold shadow-sm`}>
            {orderNum}
          </div>
          <div className="flex items-center gap-2">
            {isBingo && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20">
                🔥 Bingo
              </span>
            )}
            {isTeamPres && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20">
                🏆 Team
              </span>
            )}
            {hasQuestions && !isBingo && !isTeamPres && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-camp-green/10 text-camp-green border border-camp-green/20">
                ✏️ Interactive
              </span>
            )}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
              {status.label}
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm text-foreground mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
          {presentation.title}
        </h3>

        {/* Description */}
        {presentation.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{presentation.description}</p>
        )}

        {/* Footer meta */}
        <div className="flex items-center gap-3 pt-3 border-t border-border/50">
          {presentation.prep_time_minutes != null && presentation.prep_time_minutes > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Icon icon="clock" className="w-3 h-3" />
              {presentation.prep_time_minutes}m prep
            </span>
          )}
          {presentation.present_time_minutes != null && presentation.present_time_minutes > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Icon icon="timer" className="w-3 h-3" />
              {presentation.present_time_minutes}m present
            </span>
          )}
          {totalQuestions > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Icon icon="help-circle" className="w-3 h-3" />
              {totalQuestions} questions
            </span>
          )}
          {presentation.feedback_count > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
              <Icon icon="message-circle" className="w-3 h-3" />
              {presentation.feedback_count}
            </span>
          )}
          {presentation.avg_rating && (
            <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
              ⭐ {Number(presentation.avg_rating).toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
