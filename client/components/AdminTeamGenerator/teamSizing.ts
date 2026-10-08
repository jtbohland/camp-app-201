/** Ideal number of cAMPers per team. */
export const TARGET_TEAM_SIZE = 6;
/** Smallest team we allow. */
export const MIN_TEAM_SIZE = 2;

/** Team counts to offer: always 2–4, plus 5 and 6 when the headcount calls for them. */
export function teamCountOptions(headcount: number): number[] {
  const options = [2, 3, 4];
  const recommended = recommendedTeamCount(headcount);
  for (let n = 5; n <= Math.min(6, recommended); n++) options.push(n);
  return options;
}

/** Best team count for this headcount, aiming for ~6 per team. */
export function recommendedTeamCount(headcount: number): number {
  return Math.min(6, Math.max(2, Math.round(headcount / TARGET_TEAM_SIZE)));
}

/** Team sizes when `headcount` people are split across `teams`, e.g. "5–6". */
export function teamSizeLabel(headcount: number, teams: number): string {
  const low = Math.floor(headcount / teams);
  const high = Math.ceil(headcount / teams);
  return low === high ? `${low}` : `${low}–${high}`;
}

export function canCreate(headcount: number, teams: number): boolean {
  return headcount >= teams * MIN_TEAM_SIZE;
}
