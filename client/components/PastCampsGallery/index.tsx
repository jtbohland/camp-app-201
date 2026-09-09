import { useState } from "react";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";

const PLACE_LABELS: Record<number, { emoji: string; label: string; color: string }> = {
  1: { emoji: "🏆", label: "Champions", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  2: { emoji: "🥈", label: "2nd Place", color: "bg-gray-100 text-gray-700 border-gray-300" },
  3: { emoji: "🥉", label: "3rd Place", color: "bg-orange-100 text-orange-700 border-orange-300" },
  4: { emoji: "4️⃣", label: "4th Place", color: "bg-slate-100 text-slate-600 border-slate-300" },
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

const CAMP_EMOJIS = ["🏕️", "🌲", "🔥", "⛺", "🌄", "🦌", "🎣", "🧭", "🌙", "🦅", "🐻", "🪵", "🌿", "⭐", "🏔️", "🛶"];
const GRADIENTS = [
  "from-emerald-100 via-teal-50 to-green-100",
  "from-sky-100 via-blue-50 to-indigo-100",
  "from-amber-100 via-yellow-50 to-orange-100",
  "from-rose-100 via-pink-50 to-red-100",
  "from-violet-100 via-purple-50 to-fuchsia-100",
  "from-cyan-100 via-teal-50 to-emerald-100",
  "from-lime-100 via-green-50 to-emerald-100",
  "from-orange-100 via-amber-50 to-yellow-100",
];

function NoLogoPlaceholder({ teamName, teamId }: { teamName: string; teamId: number }) {
  const emojiIdx = teamId % CAMP_EMOJIS.length;
  const gradIdx = teamId % GRADIENTS.length;
  const emoji1 = CAMP_EMOJIS[emojiIdx];
  const emoji2 = CAMP_EMOJIS[(emojiIdx + 3) % CAMP_EMOJIS.length];
  const emoji3 = CAMP_EMOJIS[(emojiIdx + 7) % CAMP_EMOJIS.length];

  return (
    <div className={`bg-gradient-to-br ${GRADIENTS[gradIdx]} p-8 flex flex-col items-center justify-center gap-2 min-h-[140px]`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl opacity-60">{emoji1}</span>
        <span className="text-4xl">{emoji2}</span>
        <span className="text-3xl opacity-60">{emoji3}</span>
      </div>
      <div className="text-sm font-bold text-foreground/40 tracking-wider uppercase mt-1">
        {teamName}
      </div>
    </div>
  );
}

function TeamCard({ team, hasLogos, hasPoints }: { team: Team; hasLogos: boolean; hasPoints: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const placeInfo = team.place ? PLACE_LABELS[team.place] : null;

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
        team.is_winner ? "ring-2 ring-yellow-400 shadow-yellow-100" : ""
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Logo area */}
      {hasLogos && team.logo_url ? (
        <div className="relative bg-gray-50 flex items-center justify-center p-4">
          <img
            src={team.logo_url}
            alt={team.team_name}
            className="w-full max-h-64 object-contain rounded-lg"
          />
          {team.is_winner && (
            <div className="absolute top-3 right-3">
              <Badge className="bg-yellow-400 text-yellow-900 text-sm font-bold px-3 py-1 shadow-md">
                🏆 Champions
              </Badge>
            </div>
          )}
        </div>
      ) : (
        <NoLogoPlaceholder teamName={team.team_name} teamId={team.id} />
      )}

      {/* Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-bold text-foreground">{team.team_name}</h3>
          {placeInfo && (
            <Badge variant="outline" className={`text-xs ${placeInfo.color}`}>
              {placeInfo.emoji} {placeInfo.label}
            </Badge>
          )}
        </div>
        {team.tagline && (
          <p className="text-sm text-muted-foreground italic mb-2">"{team.tagline}"</p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {hasPoints && team.points != null && (
            <span className="flex items-center gap-1">
              <Icon icon="flame" className="w-3.5 h-3.5 text-orange-500" />
              {team.points} pts
              {team.points_note && <span className="text-[10px]">({team.points_note})</span>}
            </span>
          )}
          {team.presentation_company && (
            <span className="flex items-center gap-1">
              <Icon icon="briefcase" className="w-3.5 h-3.5" />
              {team.presentation_company}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon icon="users" className="w-3.5 h-3.5" />
            {team.members.length} members
          </span>
        </div>

        {/* Expanded members list */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Team Members</p>
            <div className="flex flex-wrap gap-1.5">
              {team.members.map((m) => (
                <Badge key={m.id} variant="secondary" className="text-xs font-normal">
                  {m.full_name}
                  {m.role && m.region && (
                    <span className="text-muted-foreground ml-1">({m.role}-{m.region})</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default function PastCampsGallery() {
  const { data, loading } = useApiData("GetPastCohorts", {});
  const cohorts: Cohort[] = data?.cohorts ?? [];

  if (loading) {
    return (
      <div className="p-6 space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-10 max-w-6xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">cAMP 201 Hall of Fame</h2>
        <p className="text-muted-foreground mt-1">Every cohort, every team, every logo — get inspired for yours!</p>
      </div>

      {cohorts.map((cohort) => (
        <div key={cohort.id}>
          {/* Cohort header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-camp-green/15 text-camp-green font-bold text-sm">
              C{cohort.cohort_number}
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                Cohort {cohort.cohort_number} — {cohort.date_label}
              </h3>
              <p className="text-xs text-muted-foreground">
                {cohort.teams.length > 0 ? `${cohort.teams.length} teams` : "Details coming soon"}
                {cohort.notes && ` · ${cohort.notes}`}
              </p>
            </div>
          </div>

          {/* Teams grid */}
          {cohort.teams.length > 0 ? (
            <div className={`grid gap-5 ${
              cohort.teams.length === 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" :
              cohort.teams.length === 3 ? "grid-cols-1 md:grid-cols-3" :
              "grid-cols-1 md:grid-cols-2"
            }`}>
              {cohort.teams.map((team) => (
                <TeamCard
                  key={team.id}
                  team={team}
                  hasLogos={cohort.has_logos}
                  hasPoints={cohort.has_points}
                />
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center text-muted-foreground bg-muted/30">
              <Icon icon="clock" className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Cohort details coming soon</p>
            </Card>
          )}
        </div>
      ))}
    </div>
  );
}
