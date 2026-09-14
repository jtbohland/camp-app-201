---
name: Outstanding Work Items — Post Phase 5
description: Pending tasks, bugs, and features to build after Phase 1-5
  completion. Reference when resuming work on the cAMP 201 app.
accessType: on_demand
isEnabled: true
createdAt: 2026-09-11T23:47:20.094Z
---

## Outstanding Items (as of Sept 11)

### Critical Bug
- **#8 Absence requests not counted in team check-in**: `submit-checkin.ts` does NOT account for `camp201_absence_requests` when calculating team completion. A team with an absent member (who filed an absence request) can never be "first team." Fix: subtract approved absences from total when checking `teamComplete`.

### Quick Fixes
- **#2 Memory points**: Change from +5 KINDling badge to: +2 for first photo, +1 for first text memory. Badge earned only after doing 1 of each (photo + text post).
- **#6 Survey progress display**: ProgressTrackers component incorrectly shows "0/5 to Tier 1" for Survey Complete. Surveys use day-based escalation (Day 1=2pts, Day 2=4pts, etc.), NOT the 5/10/15/20 tier system. Fix the tracker to show "Day X" progress instead.
- **#5 Gallery photo reactions**: Legacy gallery photos (from `camp201_gallery`) don't have emoji reactions. Either migrate old photos into `camp201_memories` table or add reaction support to gallery photos.

### Design-Heavy Features
- **#1 Close Camp button**: Need a counselor-only "Close Camp" action that: freezes all points, evaluates milestone badges (Summit Seeker 100+, Peak Performer 250+, Legend of the Lake 500+), evaluates Alpine Legend (cAMP-V-P + Top Dealer + Camp Spirit), and sets a `camp_closed` flag. Currently no automatic trigger exists.
- **#3 Badge audit**: Still 26 badges/merits — too many, confusing, repetitive. Needs to be cut to ~15 and feel ACHIEVABLE. Present a clean proposal to JT.
- **#4 XPlanation rewrite**: "How Points Work" tab needs full rewrite explaining the accelerator system, team_points, escalating surveys, and the badge vs merit distinction.

### UI Polish
- **#9 Timer dropdown**: Add session type dropdown to Timer page for counselors: "cAMP begins in…", "Back from Break", "Back from Lunch", "Prep & Practice ends in…", "Presentation Timer". Currently only has check-in labels.

### Scoring Model Reference
- **cAMP-V-P** = individual leaderboard (highest individual points)
- **cAMP Champ** = team leaderboard = SUM(members' individual points) + team_points
- Team bonuses (check-in race, survey race, hackathon, rubric) go to `team_points` column
- Individual points go to the person AND roll up to their team's total
