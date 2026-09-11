/**
 * Accelerator system for repeatable badges.
 *
 * Tier bonuses based on earn count:
 *   0–4  earns: base only (+0)
 *   5–9  earns: base +1
 *   10–14 earns: base +2
 *   15–19 earns: base +3
 *   20+  earns: base +5 (cap)
 */

// Badge IDs for repeatable activity badges
export const BADGE_IDS = {
  CHECK_IN: 133,
  SURVEY: 134,
  PEER_FEEDBACK: 135,
  HUB_POST: 136,
  QA_CONTRIBUTOR: 137,
} as const;

// Base points per badge type
export const BASE_POINTS: Record<number, number> = {
  [BADGE_IDS.CHECK_IN]: 5,
  [BADGE_IDS.PEER_FEEDBACK]: 3,
  [BADGE_IDS.HUB_POST]: 3,
  [BADGE_IDS.QA_CONTRIBUTOR]: 2,
  // Survey uses escalating base, not this system
};

/**
 * Calculate accelerator bonus based on current earn count.
 * The earnCount is BEFORE this earn (i.e., how many times they've already earned it).
 */
export function getAcceleratorBonus(earnCount: number): number {
  if (earnCount >= 20) return 5;
  if (earnCount >= 15) return 3;
  if (earnCount >= 10) return 2;
  if (earnCount >= 5) return 1;
  return 0;
}

/**
 * Calculate total points for this earn: base + accelerator bonus.
 */
export function calculateAcceleratedPoints(badgeId: number, earnCount: number): number {
  const base = BASE_POINTS[badgeId];
  if (base === undefined) return 0;
  return base + getAcceleratorBonus(earnCount);
}

/**
 * Survey escalating points: Day 1=2, Day 2=4, Day 3=6, Day 4=8, Day 5=10
 */
export function getSurveyPoints(dayNumber: number): number {
  return Math.min(dayNumber * 2, 10);
}
