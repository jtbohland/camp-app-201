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
- **Counselors see every thread** on the cAMPer's report card (Hub → cAMPers → click tile) and can reply.
- **No points for manager interactions.** Not every manager engages, and that's outside the cAMPer's control.
- Notes written before Update 28 were backfilled **counselors-only**. Never expose them to cAMPers.

## Data model (migration 0024 — shipped)
- `camp201_manager_comments`: `visibility` ('camper' | 'counselor', default 'counselor'), `camper_read_at`, `acknowledged_at`, `manager_read_at`, `counselor_read_at`
- `camp201_manager_comment_replies` (comment_id FK cascade, author_type 'camper' | 'manager' | 'counselor', author_email, author_name, content, created_at)
- Phase 4 will add `target_type` / `target_id` / `target_label` to `camp201_manager_comments`
- Unread rules live in `server/lib/manager-threads.ts` `unreadSql(role)`. Counselor alerts count only 'counselor' visibility threads.
- All manager APIs use `ctx.user.email`. `RegisterManager` rejects any email that isn't the signed-in user's (the Hub preview never saves).

## Key files
- Server: `server/lib/manager-threads.ts`, `server/apis/camp/manager-threads.ts` (GetMyManagerThreads, GetCamperManagerThreads, GetCounselorManagerInbox, GetManagerThreadBadges, ReplyToManagerThread, AcknowledgeManagerThread, MarkManagerThreadsRead), `add-manager-comment.ts`, `get-manager-dashboard.ts` (returns `threads` + `unread_count` per hire)
- Client: `lib/managerThreads.ts`, `ManagerThreadCard`, `ThreadReplyBox`, `AudienceToggle`, `HireConversations` (used in HireCard), `FromYourManagerCard` (Profile), `CounselorManagerInbox` (HubDashboard), `ReportCard/ManagerConversationsSection.tsx`. Badges are in ProfileButton, AppSidebar (Counselor Hub item), the Admin Dashboard nav, and AdminLearnerGrid tiles.

## Phases
1. ✅ **Security + two-way basics** (Update 28)
2. ✅ **Counselor side** (Update 28)
3. **Manager Report Card + Activity timeline**: managers get the Report Card scoped to their own hires. The timeline shows every action and every miss (missed check-in, skipped survey, etc.).
4. **Item-level reactions/comments**: react or comment on a specific timeline item or section. The cAMPer sees "👏 from Sarah" inline on that item.
5. **Multi-hire manager tools**: a "Today" inbox across all hires, a Needs-attention filter, Send to all my cAMPers, and unread-reply counts on hire cards.

## Status
- Phases 1+2 built in Update 28 (PR pending merge/deploy). Next: Phase 3.
