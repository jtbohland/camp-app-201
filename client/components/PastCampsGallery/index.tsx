import { useState, useMemo } from "react";
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

// ───────────────────── BEST LOGO WINNERS ─────────────────────
// Past cohort logo vote winners (by team ID in camp201_past_teams).
// For the current cohort, the live voting feature determines this automatically.
const BEST_LOGO_TEAM_IDS = new Set([11, 12, 15, 20]); // C4:Trailblazers, C5:DataPuff Girls, C6:chAMPiones, C7:K-POP Data Hunters

// ───────────────────── COMPANY BRAND PILLS ─────────────────────

interface CompanyBrand {
  emoji: string;
  color: string;       // text color
  bg: string;          // pill background
  border: string;      // pill border
}

const COMPANY_BRANDS: Record<string, CompanyBrand> = {
  "SoFi":              { emoji: "🏦", color: "#1a1a6c", bg: "#e8e8ff", border: "#c4c4f7" },
  "NBC":               { emoji: "🦚", color: "#0b5ed7", bg: "#e3f0ff", border: "#b3d4fc" },
  "Peloton":           { emoji: "🚴", color: "#1a1a1a", bg: "#f0f0f0", border: "#d4d4d4" },
  "DoorDash":          { emoji: "🚗", color: "#ff3008", bg: "#fff0ec", border: "#ffc9bc" },
  "Zillow":            { emoji: "🏠", color: "#006aff", bg: "#e6f0ff", border: "#b3d4ff" },
  "Intuit QuickBooks": { emoji: "📗", color: "#2ca01c", bg: "#eafbe7", border: "#b8e6b0" },
  "Chick-fil-A":       { emoji: "🐔", color: "#e51636", bg: "#fef2f2", border: "#fca5a5" },
  "Intermountain Health": { emoji: "🏥", color: "#c2185b", bg: "#fce4ec", border: "#f48fb1" },
  "NerdWallet":        { emoji: "🧠", color: "#1fa85e", bg: "#e8faf0", border: "#a7f3d0" },
  "Coursera":          { emoji: "🎓", color: "#0056d2", bg: "#e8f0fe", border: "#93bbf5" },
};

function CompanyPill({ company }: { company: string }) {
  const brand = COMPANY_BRANDS[company];
  if (!brand) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
        <Icon icon="briefcase" className="w-3 h-3" />
        {company}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shadow-sm"
      style={{ color: brand.color, background: brand.bg, borderWidth: 1, borderColor: brand.border, borderStyle: "solid" }}
    >
      <span>{brand.emoji}</span>
      {company}
    </span>
  );
}

// ───────────────────── TYPES ─────────────────────

const PLACE_CONFIG: Record<number, { label: string; icon: string; class: string }> = {
  1: { label: "Champions", icon: "🏆", class: "bg-gradient-to-r from-yellow-400 to-amber-500 text-white" },
  2: { label: "2nd Place", icon: "🥈", class: "bg-gradient-to-r from-gray-300 to-slate-400 text-white" },
  3: { label: "3rd Place", icon: "🥉", class: "bg-gradient-to-r from-orange-400 to-amber-600 text-white" },
  4: { label: "4th Place", icon: "4️⃣", class: "bg-slate-200 text-slate-700" },
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

/** Explicit emoji per no-logo team — no repeats within or across cohorts */
const TEAM_EMOJI_MAP: Record<string, string> = {
  // Cohort 1
  "Group One":   "🔥",   // Campfire night
  "Group Two":   "🦌",   // Forest wildlife
  "Group Three": "🐻",   // Bear country
  "Group Four":  "🦅",   // Eagle summit
};

/** Per-cohort overrides — key is "cohort:teamName" for duplicate team names across cohorts */
const COHORT_TEAM_EMOJI: Record<string, string> = {
  // Cohort 2 (same generic names, different emojis)
  "2:Group One":   "🛶",   // Lake canoeing
  "2:Group Two":   "🧭",   // Trail hiking
  "2:Group Three": "🏕️",  // Campsite sunrise
  "2:Group Four":  "🔦",   // Night exploration
  // Cohort 3
  "3:Team 1":      "🪓",   // Survival camp
  "3:Team 3":      "🎯",   // Target practice
  "3:Datalicious": "🧪",   // Data feast
  "3:Slytherin":   "🐍",   // Snake — obviously
};

/** Fallback emojis for future no-logo teams */
const FALLBACK_EMOJIS = ["🌲", "🦊", "🐟", "⛺", "🏔️", "🌙", "🦉", "🍂", "⭐", "🌊"];

function getTeamEmoji(teamName: string, cohortNumber: number, index: number): string {
  // Check cohort-specific key first (handles duplicate names across cohorts)
  const cohortKey = `${cohortNumber}:${teamName}`;
  if (COHORT_TEAM_EMOJI[cohortKey]) return COHORT_TEAM_EMOJI[cohortKey];
  // Then check global name map (cohort 1 defaults)
  if (TEAM_EMOJI_MAP[teamName]) return TEAM_EMOJI_MAP[teamName];
  // Fallback for future unknown teams
  return FALLBACK_EMOJIS[index % FALLBACK_EMOJIS.length];
}

function NoLogoPlaceholder({ teamName, theme, cohortNumber, index }: { teamName: string; theme: TeamTheme; cohortNumber: number; index: number }) {
  const emoji = getTeamEmoji(teamName, cohortNumber, index);

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
        className="w-24 h-24 rounded-full flex items-center justify-center text-4xl"
        style={{
          background: `linear-gradient(135deg, ${theme.accent}, ${theme.glow})`,
          boxShadow: `0 4px 20px ${theme.glow}50`,
        }}
      >
        {emoji}
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
  cohortNumber,
}: {
  team: Team;
  hasLogos: boolean;
  hasPoints: boolean;
  index: number;
  cohortNumber: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const theme = getTheme(team.team_name, index);
  const placeInfo = team.place ? PLACE_CONFIG[team.place] : null;

  return (
    <div
      className="group relative cursor-pointer isolate"
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
        <div className="relative overflow-hidden">
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
            <NoLogoPlaceholder teamName={team.team_name} theme={theme} cohortNumber={cohortNumber} index={index} />
          )}

          {/* Placement badge — centered at top */}
          {placeInfo && (
            <div className="absolute top-2.5 inset-x-0 z-20 flex justify-center">
              <div
                className={`${placeInfo.class} px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1`}
              >
                <span>{placeInfo.icon}</span>
                <span>{placeInfo.label}</span>
              </div>
            </div>
          )}

          {/* Best Logo pill — bottom-right of logo area */}
          {BEST_LOGO_TEAM_IDS.has(team.id) && (
            <div className="absolute bottom-2.5 right-2.5 z-20">
              <div className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1">
                <span>🎨</span>
                <span>Best Logo</span>
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

          {/* Stats row: points → members → company pill */}
          <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-xs text-muted-foreground">
            {hasPoints && team.points != null && (
              <span className="flex items-center gap-1 font-semibold" style={{ color: theme.accent }}>
                <Icon icon="flame" className="w-3.5 h-3.5" />
                {team.points} pts
                {team.points_note && (
                  <span className="font-normal text-muted-foreground text-[10px]">({team.points_note})</span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon icon="users" className="w-3 h-3" />
              {team.members.length} members
            </span>
            {team.presentation_company && (
              <CompanyPill company={team.presentation_company} />
            )}
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
              cohortNumber={cohort.cohort_number}
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

  const stats = useMemo(() => {
    let totalCampers = 0;
    let totalTeams = 0;
    const seen = new Set<string>();
    for (const c of cohorts) {
      totalTeams += c.teams.length;
      for (const t of c.teams) {
        for (const m of t.members) {
          if (!seen.has(m.full_name)) {
            seen.add(m.full_name);
            totalCampers++;
          }
        }
      }
    }
    return { totalCampers, totalTeams, totalCohorts: cohorts.length };
  }, [cohorts]);

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

        {/* cAMPer Counter */}
        {stats.totalCampers > 0 && (
          <div className="flex items-center justify-center gap-6 mt-5">
            <div className="text-center">
              <div className="text-3xl font-black text-camp-green tabular-nums">{stats.totalCampers}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">cAMPers</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-3xl font-black text-amber-600 tabular-nums">{stats.totalTeams}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Teams</div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="text-center">
              <div className="text-3xl font-black text-violet-600 tabular-nums">{stats.totalCohorts}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cohorts</div>
            </div>
          </div>
        )}
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
