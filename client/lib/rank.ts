/**
 * Leaderboard places. Ties share a place and the next group gets the next number:
 * 30, 30, 30, 25 → 1, 1, 1, 2 (not 1, 1, 1, 4).
 * `sortedScores` must already be sorted high → low.
 */
export function denseRanks(sortedScores: readonly number[]): number[] {
  let place = 0;
  let last: number | null = null;
  return sortedScores.map((s) => {
    if (s !== last) {
      place += 1;
      last = s;
    }
    return place;
  });
}
