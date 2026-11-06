---
name: Outstanding Work Items — Post Phase 5
description: Pending tasks, bugs, and features still open for the cAMP 201 app
  (validated against code Nov 6). Reference when resuming work or when JT asks
  what's left on the to-do list.
accessType: on_demand
isEnabled: true
createdAt: 2026-09-11T23:47:20.094Z
---

## Outstanding Items (validated against the code — Nov 6)

### Still open
- **#3 Badge audit**: 5 badges + 22 merits = 27 total — too many, confusing, repetitive. Needs to be cut to ~15 and feel ACHIEVABLE. Present a clean proposal to JT and wait for his decision before changing anything.
- **#4 (small remainder) XPlanation**: The accelerator system, team_points, escalating surveys, and KINDling are all documented. Only gap: the tab never explains the **badge vs merit** difference. Add a short section.

### Done (verified in code — do NOT re-list as to-dos)
- #1 Close Camp button — `close-camp.ts` + `AdminCloseCamp` / `CloseCampModal`: attendance, milestone badges, Wheel Dealer, cAMP-V-P, cAMP Champ, Alpine Legend, frozen points, `camp_closed` flag
- #2 Memory points — +2 first photo, +1 first text, KINDling after both
- #5 Gallery photo reactions — fixed in Update 27 (GetMemories now reads reactions for legacy negative-id gallery photos)
- #6 Survey tracker — `SurveyTrackerCard` shows day-based escalation
- #8 Absences in team check-in — `submit-checkin.ts` excuses approved absences
- #9 Timer dropdown — session types incl. Back from Break / Lunch
- Memories is its own sidebar tab (`/memories`, gate `memories`) right above Graduation, lockable (Update 27)

### Known technical debt
- `execute().rowCount` returns 0 for INSERT…ON CONFLICT. Still used in `server/lib/legacy-wall.ts`, `server/apis/camp/seed-word-bank.ts`, `server/apis/camp/verify-counselor.ts` — check whether those branches misbehave; switch to `RETURNING`.

### Scoring Model Reference
- **cAMP-V-P** = individual leaderboard (highest individual points)
- **cAMP Champ** = team leaderboard = SUM(members' individual points) + team_points
- Team bonuses (check-in race, survey race, hackathon, rubric) go to `team_points` column
- Individual points go to the person AND roll up to their team's total
