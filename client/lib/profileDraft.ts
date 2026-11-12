/**
 * Unsaved Profile form edits, kept in this browser so nothing typed is ever lost:
 * not to a failed save, a refresh, a closed tab, or another card on the page saving.
 * Cleared after a successful Save Profile.
 */

export type ProfileDraft = {
  bio: string;
  photoUrl: string;
  linkedinOption: string;
  linkedinUrl: string;
  managerEmail: string;
  funFact: string;
  goal1: string;
  goal2: string;
  goal3: string;
  iceBreakerAnswers: Record<string, string>;
};

const key = (email: string) => `camp201.profileDraft.${email.trim().toLowerCase()}`;

export function loadProfileDraft(email: string): ProfileDraft | null {
  if (!email) return null;
  try {
    const raw = window.localStorage.getItem(key(email));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProfileDraft>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      bio: parsed.bio ?? "",
      photoUrl: parsed.photoUrl ?? "",
      linkedinOption: parsed.linkedinOption ?? "none",
      linkedinUrl: parsed.linkedinUrl ?? "",
      managerEmail: parsed.managerEmail ?? "",
      funFact: parsed.funFact ?? "",
      goal1: parsed.goal1 ?? "",
      goal2: parsed.goal2 ?? "",
      goal3: parsed.goal3 ?? "",
      iceBreakerAnswers: parsed.iceBreakerAnswers && typeof parsed.iceBreakerAnswers === "object" ? parsed.iceBreakerAnswers : {},
    };
  } catch {
    return null;
  }
}

export function saveProfileDraft(email: string, draft: ProfileDraft): void {
  if (!email) return;
  try {
    window.localStorage.setItem(key(email), JSON.stringify(draft));
  } catch {
    // Storage full or blocked (private mode). Photos are the big item, so retry without it.
    try {
      window.localStorage.setItem(key(email), JSON.stringify({ ...draft, photoUrl: "" }));
    } catch {
      /* nothing else we can do */
    }
  }
}

export function clearProfileDraft(email: string): void {
  if (!email) return;
  try {
    window.localStorage.removeItem(key(email));
  } catch {
    /* ignore */
  }
}

/** True when two drafts hold the same values (used to know if there are unsaved edits). */
export function sameDraft(a: ProfileDraft, b: ProfileDraft): boolean {
  const ib = (r: Record<string, string>) =>
    JSON.stringify(
      Object.keys(r)
        .filter((k) => (r[k] ?? "").trim())
        .sort()
        .map((k) => [k, r[k].trim()])
    );
  return (
    a.bio.trim() === b.bio.trim() &&
    a.photoUrl === b.photoUrl &&
    a.linkedinOption === b.linkedinOption &&
    a.linkedinUrl.trim() === b.linkedinUrl.trim() &&
    a.managerEmail.trim().toLowerCase() === b.managerEmail.trim().toLowerCase() &&
    a.funFact.trim() === b.funFact.trim() &&
    a.goal1.trim() === b.goal1.trim() &&
    a.goal2.trim() === b.goal2.trim() &&
    a.goal3.trim() === b.goal3.trim() &&
    ib(a.iceBreakerAnswers) === ib(b.iceBreakerAnswers)
  );
}
