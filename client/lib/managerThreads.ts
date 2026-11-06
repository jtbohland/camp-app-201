import { queryClient } from "@superblocksteam/library";
import type { IconName } from "lucide-react/dynamic";

export type ThreadRole = "camper" | "manager" | "counselor";
export type Visibility = "camper" | "counselor";

export type ThreadReply = {
  id: number;
  author_type: string;
  author_name: string;
  content: string;
  created_at: string;
};

export type ManagerThread = {
  id: number;
  camper_id: number;
  camper_name: string;
  manager_name: string;
  comment_type: string;
  sentiment: string;
  content: string;
  visibility: string;
  created_at: string;
  acknowledged_at: string | null;
  unread: boolean;
  /** Activity item this note is about (e.g. 'survey:68'), or null for a general note. */
  target_key: string | null;
  target_label: string | null;
  replies: ThreadReply[];
};

/** A manager reaction/note pinned to one activity-timeline item. */
export type ItemNote = {
  id: number;
  camper_id: number;
  target_key: string;
  comment_type: string;
  content: string;
  visibility: string;
  manager_name: string;
  mine: boolean;
  created_at: string;
};

/** Quick reactions managers can send (general or on an item). */
export const REACTIONS = [
  { emoji: "🔥", label: "On fire!" },
  { emoji: "👏", label: "Great job" },
  { emoji: "💪", label: "Keep it up" },
  { emoji: "🎯", label: "On target" },
  { emoji: "⭐", label: "Star performer" },
  { emoji: "👀", label: "Watching" },
] as const;

/** Group item notes by timeline key for quick lookup. */
export function groupItemNotes(notes: ItemNote[] | undefined): Map<string, ItemNote[]> {
  const map = new Map<string, ItemNote[]>();
  for (const n of notes ?? []) {
    const list = map.get(n.target_key) ?? [];
    list.push(n);
    map.set(n.target_key, list);
  }
  return map;
}

export const SENTIMENTS: { value: string; label: string; icon: IconName; color: string }[] = [
  { value: "positive", label: "Positive", icon: "thumbs-up", color: "text-green-500" },
  { value: "encouraging", label: "Encouraging", icon: "heart", color: "text-pink-500" },
  { value: "feedback", label: "Feedback", icon: "message-circle", color: "text-blue-500" },
  { value: "concerning", label: "Concerning", icon: "alert-triangle", color: "text-amber-500" },
];

export const AUTHOR_STYLES: Record<string, { label: string; className: string }> = {
  manager: { label: "Manager", className: "bg-blue-100 text-blue-700" },
  camper: { label: "cAMPer", className: "bg-emerald-100 text-emerald-700" },
  counselor: { label: "Counselor", className: "bg-amber-100 text-amber-800" },
};

/** Every API whose data changes when a thread is created, replied to, acknowledged or read. */
const THREAD_APIS = [
  "GetManagerDashboard",
  "GetMyManagerThreads",
  "GetCamperManagerThreads",
  "GetCounselorManagerInbox",
  "GetManagerThreadBadges",
  "GetAdminManagerOverview",
  "GetCamperActivity",
  "GetManagerTodayFeed",
] as const;

export async function refreshThreadViews(): Promise<void> {
  await Promise.all(THREAD_APIS.map((name) => queryClient.invalidateQueries(name)));
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}
