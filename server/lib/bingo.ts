/**
 * Fair Fireside Finder cards.
 *
 * - Every cAMPer shows up at least once, at most 2 squares (3 when the cohort is under 12).
 * - With more than 24 other cAMPers there isn't room for everyone, so each card gets a
 *   different rotation: across the cohort's cards everyone shows up about equally often.
 * - cAMPers without a fun fact or icebreakers still get squares from profile details
 *   (city, country, start month).
 * - Generic filler squares are only used when the cohort has run out of real facts.
 * - A cAMPer never gets squares about themselves.
 */

export type BingoPerson = {
  id: number;
  first_name: string;
  fun_fact: string | null;
  ice_breaker_q1: string | null;
  ice_breaker_q2: string | null;
  ice_breaker_q3: string | null;
  city: string | null;
  country: string | null;
  start_date: string | null;
};

export type BingoPick = { fact: string; camper_id: number };

const SQUARES = 24;

const GENERIC_FACTS = [
  "Has been camping before", "Prefers coffee over tea", "Has a pet at home",
  "Plays a musical instrument", "Has traveled to 5+ countries", "Is a morning person",
  "Speaks more than one language", "Has run a marathon", "Loves hiking",
  "Has a hidden talent", "Collects something unusual", "Has met a celebrity",
  "Can cook a great meal", "Has binge-watched a show this month", "Prefers mountains over beach",
  "Has a go-to karaoke song", "Has lived in another country", "Is a night owl",
  "Has a green thumb", "Has skydived or bungee jumped", "Reads more than 10 books a year",
  "Has a secret snack weakness", "Can do a cartwheel", "Has a tattoo",
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Real facts first (fun fact, icebreakers), then profile details. */
export function factsFor(p: BingoPerson): { real: string[]; profile: string[] } {
  const real = [p.fun_fact, p.ice_breaker_q1, p.ice_breaker_q2, p.ice_breaker_q3]
    .map((f) => f?.trim() ?? "")
    .filter((f) => f.length > 0);
  const profile: string[] = [];
  if (p.city?.trim()) profile.push(`Lives in ${p.city.trim()}`);
  if (p.country?.trim()) profile.push(`Is based in ${p.country.trim()}`);
  if (p.start_date) {
    const d = new Date(p.start_date);
    if (!Number.isNaN(d.getTime())) profile.push(`Started at Amplitude in ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`);
  }
  return { real, profile };
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function shuffleWithSeed<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Picks 24 squares for one cAMPer's card.
 * @param cohortSize every non-counselor in the cohort, including the card owner
 * @param cardSlot this card's position among the cohort's cards (stable per cAMPer)
 */
export function buildFairCard(
  others: BingoPerson[],
  ownerId: number,
  cohortSize: number,
  cardSlot: number,
): BingoPick[] {
  const maxPerPerson = cohortSize < 12 ? 3 : 2;

  // Each person's facts in a per-card random order (real first, then profile).
  const pools = new Map<number, string[]>();
  for (const p of others) {
    const { real, profile } = factsFor(p);
    const ordered = [...shuffleWithSeed(real, ownerId * 31 + p.id), ...shuffleWithSeed(profile, ownerId * 17 + p.id)];
    if (ordered.length > 0) pools.set(p.id, ordered);
  }

  // Order people so that, across cards, everyone gets a turn at the front.
  // Big cohorts: rotate the starting point by card slot, then a light per-card shuffle within
  // windows so neighbors aren't always paired.
  const people = [...pools.keys()].sort((a, b) => a - b);
  const offset = people.length > 0 ? (cardSlot * SQUARES) % people.length : 0;
  const rotated = [...people.slice(offset), ...people.slice(0, offset)];
  const order = people.length > SQUARES
    ? [...shuffleWithSeed(rotated.slice(0, SQUARES), ownerId), ...shuffleWithSeed(rotated.slice(SQUARES), ownerId + 7)]
    : shuffleWithSeed(rotated, ownerId);

  const picks: BingoPick[] = [];
  const used = new Map<number, number>();
  const seen = new Set<string>();

  const take = (pid: number): boolean => {
    const pool = pools.get(pid);
    const n = used.get(pid) ?? 0;
    if (!pool || n >= maxPerPerson) return false;
    while (pool.length > 0) {
      const fact = pool.shift()!;
      const key = fact.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      picks.push({ fact, camper_id: pid });
      used.set(pid, n + 1);
      return true;
    }
    return false;
  };

  // Round 1: one square for each person (everyone, if they fit on the card).
  for (const pid of order) {
    if (picks.length >= SQUARES) break;
    take(pid);
  }
  // Rounds 2..max: more squares, people with real facts first, until the card is full.
  for (let round = 2; round <= maxPerPerson && picks.length < SQUARES; round++) {
    const withReal = order.filter((pid) => factsFor(others.find((o) => o.id === pid)!).real.length >= round);
    const rest = order.filter((pid) => !withReal.includes(pid));
    for (const pid of [...withReal, ...rest]) {
      if (picks.length >= SQUARES) break;
      take(pid);
    }
  }

  // Last resort: generic filler (not tied to anyone).
  const fillers = shuffleWithSeed(GENERIC_FACTS, ownerId + 4242);
  for (const fact of fillers) {
    if (picks.length >= SQUARES) break;
    if (seen.has(fact.toLowerCase())) continue;
    picks.push({ fact, camper_id: 0 });
  }

  return shuffleWithSeed(picks.slice(0, SQUARES), ownerId);
}
