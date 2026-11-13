import type { IconName } from "lucide-react/dynamic";
import type { ApiRegistry } from "../../server/apis/index.js";

/** Output of GetTeamHub, straight from the API registry so it never drifts. */
type HubOutput = Awaited<ReturnType<ApiRegistry["GetTeamHub"]["run"]>>;

export type HubData = HubOutput;
export type HubItem = HubOutput["items"][number];
export type HubPresentation = HubOutput["presentations"][number];
export type HubFeedback = HubOutput["peer_feedback"][number];
export type HubScore = HubOutput["scores"][number];

export type HubMember = {
  id: number;
  first_name: string;
  last_name: string;
  points: number;
  photo_url: string | null;
  role: string | null;
  country: string | null;
};

/** Hub tab keys: home, the general board, or one per presentation. */
export const HOME_TAB = "home";
export const BOARD_SECTION = "board";
export const presKey = (id: number) => `pres_${id}`;

export const ITEM_TYPES: { key: string; label: string; icon: IconName }[] = [
  { key: "note", label: "Note", icon: "sticky-note" },
  { key: "idea", label: "Idea", icon: "lightbulb" },
  { key: "task", label: "To-do", icon: "square-check" },
  { key: "resource", label: "Link", icon: "link" },
  { key: "doc", label: "Deck / Doc", icon: "file-text" },
];

export const itemTypeMeta = (key: string) => ITEM_TYPES.find((t) => t.key === key) ?? ITEM_TYPES[0];

export const PRES_TYPE_META: Record<string, { label: string; icon: IconName }> = {
  team_presentation: { label: "Team presentation", icon: "presentation" },
  team_workshop: { label: "Team workshop", icon: "search" },
  hackathon: { label: "AI build", icon: "bot" },
  bingo: { label: "Icebreaker", icon: "target" },
  standard: { label: "Individual exercise", icon: "clipboard-list" },
};

export const presTypeMeta = (type: string) => PRES_TYPE_META[type] ?? PRES_TYPE_META.standard;

/** Presentation types the whole team works on together (gets a team board + feedback). */
export const isTeamWork = (type: string) => ["team_presentation", "team_workshop", "hackathon"].includes(type);

/**
 * Board for a post's section. Posts in sections that no longer match a scheduled presentation
 * (old keys like "notes", or a presentation moved back to the bank) land on the Team Board.
 */
export function boardFor(section: string, scheduledKeys: Set<string>): string {
  return scheduledKeys.has(section) ? section : BOARD_SECTION;
}

/** Prep progress for one presentation, for the Home checklist and tab badges. */
export function prepStatus(p: HubPresentation, postCount: number): { label: string; done: boolean } {
  if (p.presentation_type === "hackathon") {
    return p.has_submission ? { label: "Submitted", done: true } : { label: "Not submitted", done: false };
  }
  if (p.presentation_type === "team_workshop" && p.question_count > 0) {
    const done = p.answered_count >= p.question_count;
    return { label: `${Math.min(p.answered_count, p.question_count)}/${p.question_count} answered`, done };
  }
  if (p.presentation_type === "team_presentation") {
    return postCount > 0 ? { label: `${postCount} post${postCount === 1 ? "" : "s"}`, done: false } : { label: "No prep yet", done: false };
  }
  return { label: "Individual", done: false };
}

export function errorText(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return "Request failed";
}

export function timeAgo(iso: string): string {
  const then = new Date(iso.replace(" ", "T")).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return days < 7 ? `${days}d ago` : new Date(then).toLocaleDateString();
}
