---
name: Manager Engagement Overhaul Plan
description: Phased build plan for manager ↔ cAMPer ↔ counselor messaging,
  manager report card, item-level reactions, and manager inbox. Use when JT asks
  about manager features, manager comments/threads, or what phase of the manager
  overhaul is next.
accessType: on_demand
isEnabled: true
createdAt: 2026-11-06T20:13:19.097Z
---

# Manager Engagement Overhaul (agreed with JT, Nov 6)

## JT's rules
- **Two audiences per message:** a manager picks **cAMPer** (cAMPer sees it and can reply) or **Counselors only** (cAMPer never sees it).
- **cAMPers only reply.** They never start a conversation with their manager, so they aren't distracted.
- **Counselors can see every thread** from the cAMPer's tile/report card in Counselor Hub → cAMPers.
- **No points for manager interactions.** Not every manager engages, and that's outside the cAMPer's control.
- Existing `camp201_manager_comments` rows were written under "visible to you and counselors", so they **backfill as counselors-only**. Never expose them to cAMPers.

## Data model
- `camp201_manager_comments` + `visibility` ('camper' | 'counselor'), `target_type` (null = general, or 'survey' / 'badge' / 'prework' / 'presentation' / 'memory' / 'wheel' / 'checkin' / 'exec_q'), `target_id`, `target_label`, `camper_read_at`, `acknowledged_at`, `counselor_read_at`, `parent_id`
- `camp201_manager_comment_replies` (comment_id, author_type 'camper' | 'manager' | 'counselor', author_id, content, created_at, read_by_manager_at)
- All manager APIs identify the manager from `ctx.user.email` (server-side), never a client-passed email.

## Phases
1. **Security + two-way basics**: lock manager APIs to `ctx.user.email`. Add the Visibility toggle to the comment form. Add a "From your manager" card on the cAMPer Profile with reply + 👍 Got it. Show reply threads on the HireCard. Add an unread dot in the cAMPer sidebar.
2. **Counselor side**: a Manager Messages inbox on the Hub Dashboard with an unread count on the Counselor Hub nav. A message badge on each cAMPer tile. A Manager Conversations section on the Report Card (all threads, both audiences). Counselors can reply.
3. **Manager Report Card + Activity timeline**: managers get the Report Card scoped to their own hires. The timeline shows every action and every miss (missed check-in, skipped survey, etc.).
4. **Item-level reactions/comments**: react or comment on a specific timeline item or section. The cAMPer sees "👏 from Sarah" inline on that item.
5. **Multi-hire manager tools**: a "Today" inbox across all hires, a Needs-attention filter, Send to all my cAMPers, and unread-reply counts on hire cards.

## Status
- Phase 1: not started
