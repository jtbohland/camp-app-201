import { useState } from "react";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";

// ───────────────────── COLOR THEMES ─────────────────────
// Each team in cohorts 4–7 gets a color extracted from its logo.
// Future cohorts: add an entry here keyed by team name.
// Fallback: cycles through PALETTE for any unlisted team.

interface TeamTheme {
  /** Primary accent hex */
  accent: string;
  /** Lighter background tint */
  bg: string;
  /** Border/glow color */
  glow: string;
  /** Ring for winner */
  ring: string;
}

function makeTheme(accent: string, bg: string, glow: string): TeamTheme {
  return { accent, bg, glow, ring: glow };
}

/** Explicit color assignments pulled from each team's logo */
const TEAM_COLOR_MAP: Record<string, TeamTheme> = {
  // Cohort 4
  "Value Drivers":           makeTheme("#1e3a5f", "#e8f0fe", "#3b82f6"),     // navy/blue logo
  "Campliteers":             makeTheme("#b91c1c", "#fef2f2", "#ef4444"),     // red badge
  "Trailblazers":            makeTheme("#0d7377", "#ecfdf5", "#14b8a6"),     // teal mountains

  // Cohort 5
  "The DataPuff Girls":      makeTheme("#c026d3", "#fdf4ff", "#e879f9"),     // pink/magenta
  "The English Breakfast Club": makeTheme("#991b1b", "#fff1f2", "#f87171"),  // red/crimson
  "The cAMPtastic Four":     makeTheme("#1e40af", "#eff6ff", "#60a5fa"),     // blue

  // Cohort 6
  "chAMPiones":              makeTheme("#c2410c", "#fff7ed", "#fb923c"),     // orange/amber
  "cAMPfire Insights":       makeTheme("#0e4da4", "#eff6ff", "#3b82f6"),    // dark blue
  "S'more Conversions":      makeTheme("#166534", "#f0fdf4", "#4ade80"),    // green

  // Cohort 7
  "Five Wavemakers":         makeTheme("#b91c1c", "#fef2f2", "#f87171"),    // red boat
  "Wave Makers":             makeTheme("#1e3a8a", "#eff6ff", "#60a5fa"),    // blue surf
  "K-POP Data Hunters":      makeTheme("#6d28d9", "#f5f3ff", "#a78bfa"),    // purple/violet
  "Funnel Scouts":           makeTheme("#166534", "#f0fdf4", "#4ade80"),    // green trees
};

/** Palette for future cohorts without an explicit entry */
const PALETTE: TeamTheme[] = [
  makeTheme("#b91c1c", "#fef2f2", "#f87171"),   // red
  makeTheme("#1e40af", "#eff6ff", "#60a5fa"),   // blue
  makeTheme("#166534", "#f0fdf4", "#4ade80"),   // green
  makeTheme("#c026d3", "#fdf4ff", "#e879f9"),   // magenta
  makeTheme("#c2410c", "#fff7ed", "#fb923c"),   // orange
  makeTheme("#6d28d9", "#f5f3ff", "#a78bfa"),   // violet
  makeTheme("#0d7377", "#ecfdf5", "#14b8a6"),   // teal
  makeTheme("#92400e", "#fffbeb", "#fbbf24"),   // gold
];

function getTheme(teamName: string, index: number): TeamTheme {
  return TEAM_COLOR_MAP[teamName] ?? PALETTE[index % PALETTE.length];
}

// ───────────────────── TYPES ─────────────────────

const PLACE_CONFIG: Record<number, { label: string; icon: string; class: string }> = {
  1: { label: "Champions", icon: "🏆", class: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white" },
  2: { label: "2nd Place", icon: "🥈", class: "bg-gradient-to-r from-gray-300 to-slate-400 text-white" },
  3: { label: "3rd Place", icon: "🥉", class: "bg-gradient-to-r from-orange-400 to-amber-600 text-white" },
  4: { label: "4th Place", icon: "4", class: "bg-slate-200 text-slate-700" },
};

interface Team {
  id: number;
  team_name: string;
  logo_url: string | null;
  points: number | null;
  points_note: string | null;
  place: number | null;
  is_winner: boolean;
  tagline: string | null;
  presentation_company: string | null;
  members: Array<{ id: number; full_name: string; role: string | null; region: string | null }>;
}

interface Cohort {
  id: number;
  cohort_number: number;
  date_label: string;
  month: string;
  year: number;
  num_teams: number;
  has_team_names: boolean;
  has_logos: boolean;
  has_points: boolean;
  notes: string | null;
  teams: Team[];
}

// ───────────────────── NO-LOGO PLACEHOLDER ─────────────────────

function NoLogoPlaceholder({ teamName, theme }: { teamName: string; theme: TeamTheme }) {
  const initials = teamName
    .replace(/^The\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className="aspect-square flex items-center justify-center relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${theme.bg} 0%, white 50%, ${theme.bg} 100%)` }}
    >
      {/* Radial ring decoration */}
      <div
        className="absolute inset-4 rounded-full opacity-10"
        style={{ border: `3px dashed ${theme.accent}` }}
      />
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black tracking-wider"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.glow})`,
          color: "white",
          boxShadow: `0 4px 20px ${theme.glow}50`,
        }}
      >
        {initials}
      </div>
    </div>
  );
}

// ───────────────────── HALL OF FAME TEAM CARD ─────────────────────

function HallOfFameCard({
  team,
  hasLogos,
  hasPoints,
  index,
}: {
  team: Team;
  hasLogos: boolean;
  hasPoints: boolean;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = getTheme(team.team_name, index);
  const placeInfo = team.place ? PLACE_CONFIG[team.place] : null;

  return (
    <div
      className="group relative cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Outer glow on hover */}
      <div
        className="absolute -inset-[2px] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
        style={{ background: `linear-gradient(135deg, ${theme.glow}40, ${theme.accent}30)` }}
      />

      <Card
        className="relative overflow-hidden rounded-2xl transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl"
        style={{
          borderColor: team.is_winner ? theme.glow : `${theme.accent}25`,
          borderWidth: team.is_winner ? "2px" : "1px",
          boxShadow: team.is_winner
            ? `0 0 20px ${theme.glow}30, 0 4px 12px rgba(0,0,0,0.08)`
            : "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Color accent bar at top */}
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.glow}, ${theme.accent})` }}
        />

        {/* Logo area */}
        <div className="relative">
          {hasLogos && team.logo_url ? (
            <div
              className="aspect-square flex items-center justify-center p-5 relative overflow-hidden"
              style={{ background: `radial-gradient(circle at center, white 30%, ${theme.bg} 100%)` }}
            >
              {/* Subtle pattern rings */}
              <div
                className="absolute inset-0 opacity-[0.04]"
                style={{
                  backgroundImage: `radial-gradient(circle at center, transparent 40%, ${theme.accent} 41%, transparent 42%), radial-gradient(circle at center, transparent 60%, ${theme.accent} 61%, transparent 62%), radial-gradient(circle at center, transparent 80%, ${theme.accent} 81%, transparent 82%)`,
                }}
              />
              <img
                src={team.logo_url}
                alt={team.team_name}
                className="w-full h-full object-contain relative z-10 drop-shadow-md transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ) : (
            <NoLogoPlaceholder teamName={team.team_name} theme={theme} />
          )}

          {/* Placement badge — floats in top-right */}
          {placeInfo && (
            <div className="absolute top-3 right-3 z-20">
              <div
                className={`${placeInfo.class} px-2.5 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1`}
              >
                <span>{placeInfo.icon}</span>
                <span>{placeInfo.label}</span>
              </div>
            </div>
          )}
        </div>

        {/* Info section with colored left border accent */}
        <div
          className="p-4 border-t"
          style={{ borderColor: `${theme.accent}15` }}
        >
          {/* Team name */}
          <h3
            className="text-base font-extrabold tracking-tight leading-tight"
            style={{ color: theme.accent }}
          >
            {team.team_name}
          </h3>

          {/* Tagline */}
          {team.tagline && (
            <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">
              "{team.tagline}"
            </p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 mt-2.5 text-xs text-muted-foreground">
            {hasPoints && team.points != null && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: theme.accent }}>
                <Icon icon="flame" className="w-3.5 h-3.5" />
                {team.points} pts
                {team.points_note && (
                  <span className="font-normal text-muted-foreground text-[10px]">({team.points_note})</span>
                )}
              </span>
            )}
            {team.presentation_company && (
              <span className="flex items-center gap-1">
                <Icon icon="briefcase" className="w-3 h-3" />
                {team.presentation_company}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon icon="users" className="w-3 h-3" />
              {team.members.length} members
            </span>
          </div>

          {/* Expanded members */}
          {expanded && team.members.length > 0 && (
            <div
              className="mt-3 pt-3"
              style={{ borderTop: `1px solid ${theme.accent}15` }}
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Team Members
              </p>
              <div className="flex flex-wrap gap-1.5">
                {team.members.map((m) => (
                  <Badge
                    key={m.id}
                    variant="secondary"
                    className="text-xs font-normal"
                    style={{
                      background: `${theme.accent}10`,
                      borderColor: `${theme.accent}20`,
                      color: theme.accent,
                    }}
                  >
                    {m.full_name}
                    {m.role && m.region && (
                      <span className="opacity-60 ml-1">({m.role}-{m.region})</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ───────────────────── COHORT SECTION ─────────────────────

function CohortSection({ cohort }: { cohort: Cohort }) {
  // For cohorts with logos (4+), use bigger tiles
  const hasRealContent = cohort.has_logos || cohort.has_team_names;

  return (
    <div className="relative">
      {/* Cohort header */}
      <div className="flex items-center gap-4 mb-5">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-xl font-black text-sm text-white shadow-md"
          style={{
            background: "linear-gradient(135deg, #1b3a2d, #2d5a3f)",
          }}
        >
          C{cohort.cohort_number}
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            Cohort {cohort.cohort_number}
            <span className="font-normal text-muted-foreground ml-2">— {cohort.date_label}</span>
          </h3>
          <p className="text-xs text-muted-foreground">
            {cohort.teams.length > 0
              ? `${cohort.teams.length} team${cohort.teams.length > 1 ? "s" : ""} competed`
              : "Details coming soon"}
            {cohort.notes && <span className="ml-1">· {cohort.notes}</span>}
          </p>
        </div>
      </div>

      {/* Teams grid */}
      {cohort.teams.length > 0 ? (
        <div
          className={`grid gap-5 ${
            cohort.teams.length >= 4
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
              : cohort.teams.length === 3
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2"
          }`}
        >
          {cohort.teams.map((team, i) => (
            <HallOfFameCard
              key={team.id}
              team={team}
              hasLogos={cohort.has_logos}
              hasPoints={cohort.has_points}
              index={i}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-muted-foreground bg-muted/30 rounded-2xl">
          <Icon icon="clock" className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Cohort details coming soon</p>
        </Card>
      )}
    </div>
  );
}

// ───────────────────── MAIN GALLERY ─────────────────────

export default function PastCampsGallery() {
  const { data, loading } = useApiData("GetPastCohorts", {});
  const cohorts: Cohort[] = data?.cohorts ?? [];

  if (loading) {
    return (
      <div className="p-6 space-y-10">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-10 w-56 mb-5 rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
              <Skeleton className="h-72 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-12 max-w-7xl mx-auto">
      {/* Hero header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-widest mb-3">
          <span>🏆</span> Hall of Fame <span>🏆</span>
        </div>
        <h2 className="text-3xl font-black text-foreground tracking-tight">
          cAMP 201 Legacy Wall
        </h2>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
          Every cohort. Every team. Every logo. These legends paved the way — now it's your turn to join the ranks.
        </p>
      </div>

      {/* Cohort sections */}
      {cohorts.map((cohort, i) => (
        <div key={cohort.id}>
          <CohortSection cohort={cohort} />
          {/* Divider between cohorts */}
          {i < cohorts.length - 1 && (
            <div className="flex items-center gap-4 mt-10">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground/50 select-none">⛺</span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
