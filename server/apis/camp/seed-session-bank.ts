import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const SESSIONS = [
  { title: "Welcome to cAMP & Game", duration: 90, type: "core" },
  { title: "Welcome & Review", duration: 30, type: "core" },
  { title: "Lunch", duration: 60, type: "break" },
  { title: "Breaking cAMP", duration: 15, type: "core" },
  { title: "Breakfast & Office Logistics", duration: 30, type: "core" },
  { title: "cAMP 201 Group Photo", duration: 15, type: "core" },
  { title: "Happy Hour", duration: 90, type: "social" },
  { title: "Company All-Hand", duration: 30, type: "core" },
  { title: "Value Pillars & Use Cases", duration: 60, type: "challenger" },
  { title: "Industry Use Cases", duration: 45, type: "challenger" },
  { title: "Challenger: Investigate & Profiles", duration: 30, type: "challenger" },
  { title: "Challenger: Constructive Tension", duration: 60, type: "challenger" },
  { title: "Challenger: Teach, Tailor, Take Control", duration: 30, type: "challenger" },
  { title: "Challenger: Commercial Insights", duration: 35, type: "challenger" },
  { title: "Profiles & Communication Styles", duration: 90, type: "challenger" },
  { title: "The Customer Journey", duration: 30, type: "challenger" },
  { title: "Workshop: Challenger AI Research", duration: 75, type: "workshop" },
  { title: "Workshop: Value Mapping", duration: 60, type: "workshop" },
  { title: "Workshop: Product (cAMP 101)", duration: 120, type: "workshop" },
  { title: "Workshop: Prepare a Mock Meeting", duration: 60, type: "workshop" },
  { title: "Research with AI (Value & PoV)", duration: 45, type: "workshop" },
  { title: "AI Hackathon", duration: 60, type: "workshop" },
  { title: "AI Activity", duration: 60, type: "workshop" },
  { title: "Value Based Demos", duration: 60, type: "value" },
  { title: "Value Based Implementations (SDRs Out!)", duration: 50, type: "value" },
  { title: "CEM", duration: 30, type: "value" },
  { title: "GTM Pod Tower", duration: 60, type: "value" },
  { title: "EBR Workshop & Presentation Prep", duration: 120, type: "presentation" },
  { title: "Presentation Prep", duration: 60, type: "presentation" },
  { title: "Group Presentations (Value Map)", duration: 75, type: "presentation" },
  { title: "Final Presentations", duration: 150, type: "presentation" },
  { title: "cAMP Graduation", duration: 30, type: "presentation" },
  { title: "Meet the CEO", duration: 45, type: "executive" },
  { title: "Meet the CCO", duration: 45, type: "executive" },
  { title: "Meet the CRO", duration: 60, type: "executive" },
  { title: "Meet the CIO", duration: 30, type: "executive" },
  { title: "Meet the President", duration: 30, type: "executive" },
  { title: "Meet an AVP/VP of Sales", duration: 45, type: "executive" },
  { title: "Meet the SVP (NAMER)", duration: 45, type: "executive" },
  { title: "Meet the VP of Customer Success", duration: 30, type: "executive" },
  { title: "Meet the Director of Customer Experience", duration: 45, type: "executive" },
  { title: "Review and Wrap Up", duration: 30, type: "core" },
];

const SCHEDULE = [
  { day: 1, start: "08:30", end: "09:00", title: "Breakfast & Office Logistics", type: "core" },
  { day: 1, start: "09:00", end: "10:30", title: "Welcome to cAMP & Game", type: "core" },
  { day: 1, start: "11:00", end: "12:00", title: "Value Pillars & Use Cases", type: "challenger" },
  { day: 1, start: "12:00", end: "13:00", title: "Lunch", type: "break" },
  { day: 1, start: "13:00", end: "13:45", title: "Meet the CEO", type: "executive" },
  { day: 1, start: "14:00", end: "14:30", title: "The Customer Journey", type: "challenger" },
  { day: 1, start: "14:30", end: "15:00", title: "Challenger: Investigate & Profiles", type: "challenger" },
  { day: 1, start: "15:15", end: "16:00", title: "Research with AI (Value & PoV)", type: "workshop" },
  { day: 1, start: "16:00", end: "16:45", title: "Workshop: Challenger AI Research", type: "workshop" },
  { day: 1, start: "16:45", end: "17:00", title: "Breaking cAMP", type: "core" },
  { day: 2, start: "09:00", end: "09:30", title: "Welcome & Review", type: "core" },
  { day: 2, start: "09:30", end: "10:00", title: "Meet the CIO", type: "executive" },
  { day: 2, start: "10:00", end: "12:00", title: "Workshop: Product (cAMP 101)", type: "workshop" },
  { day: 2, start: "12:00", end: "13:00", title: "Lunch", type: "break" },
  { day: 2, start: "13:00", end: "14:30", title: "Profiles & Communication Styles", type: "challenger" },
  { day: 2, start: "15:00", end: "16:00", title: "Challenger: Constructive Tension", type: "challenger" },
  { day: 2, start: "16:00", end: "17:00", title: "Workshop: Prepare a Mock Meeting", type: "workshop" },
  { day: 3, start: "09:00", end: "09:30", title: "Welcome & Review", type: "core" },
  { day: 3, start: "09:30", end: "10:45", title: "Group Presentations (Value Map)", type: "presentation" },
  { day: 3, start: "11:00", end: "12:00", title: "Value Based Demos", type: "value" },
  { day: 3, start: "12:00", end: "13:00", title: "Lunch", type: "break" },
  { day: 3, start: "13:00", end: "13:30", title: "Meet the President", type: "executive" },
  { day: 3, start: "13:45", end: "14:35", title: "Value Based Implementations (SDRs Out!)", type: "value" },
  { day: 3, start: "15:00", end: "16:00", title: "AI Hackathon", type: "workshop" },
  { day: 3, start: "16:00", end: "16:30", title: "Review and Wrap Up", type: "core" },
  { day: 4, start: "09:00", end: "09:30", title: "Welcome & Review", type: "core" },
  { day: 4, start: "09:30", end: "10:00", title: "Meet the VP of Customer Success", type: "executive" },
  { day: 4, start: "10:00", end: "12:00", title: "EBR Workshop & Presentation Prep", type: "presentation" },
  { day: 4, start: "12:00", end: "13:00", title: "Lunch", type: "break" },
  { day: 4, start: "13:00", end: "14:00", title: "Meet the CRO", type: "executive" },
  { day: 4, start: "14:00", end: "16:30", title: "Final Presentations", type: "presentation" },
  { day: 4, start: "16:30", end: "17:00", title: "cAMP Graduation", type: "presentation" },
];

export default api({
  name: "SeedSessionBank",
  description: "Seeds 42 sessions into the bank and pre-populates a 4-day schedule.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ sessions_seeded: z.number(), schedule_seeded: z.number(), success: z.boolean() }),
  async run(ctx) {
    // Clear existing bank and agenda for a clean slate
    await ctx.integrations.camp_db.execute(
      `DELETE FROM camp201_agenda`, undefined, { label: "Clear agenda" }
    );
    await ctx.integrations.camp_db.execute(
      `DELETE FROM camp201_session_bank`, undefined, { label: "Clear session bank" }
    );

    // Insert sessions
    for (const s of SESSIONS) {
      await ctx.integrations.camp_db.execute(
        `INSERT INTO camp201_session_bank (title, description, duration_minutes, session_type, created_by)
         VALUES ($1, '', $2, $3, '')`,
        [s.title, s.duration, s.type],
        { label: `Seed: ${s.title}` }
      );
    }

    // Set num_days to 4
    await ctx.integrations.camp_db.execute(
      `INSERT INTO camp201_config (key, value) VALUES ('num_days', '4')
       ON CONFLICT (key) DO UPDATE SET value = '4'`,
      undefined,
      { label: "Set default 4 days" }
    );

    // Insert schedule, linking to bank sessions by title
    for (const s of SCHEDULE) {
      const bankRow = await ctx.integrations.camp_db.query(
        `SELECT id FROM camp201_session_bank WHERE title = $1 LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [s.title],
        { label: `Find bank ID for ${s.title}` }
      );
      const bankId = bankRow.length > 0 ? bankRow[0].id : null;

      await ctx.integrations.camp_db.execute(
        `INSERT INTO camp201_agenda (session_bank_id, day_number, start_time, end_time, title, session_type)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bankId, s.day, s.start, s.end, s.title, s.type],
        { label: `Schedule: Day ${s.day} ${s.title}` }
      );
    }

    return { sessions_seeded: SESSIONS.length, schedule_seeded: SCHEDULE.length, success: true };
  },
});
