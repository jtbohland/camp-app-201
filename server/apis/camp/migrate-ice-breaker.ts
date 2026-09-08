import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateIceBreaker",
  description: "Adds ice_breaker_answers JSONB column and updates pre-work seed data.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    // Add ice_breaker_answers JSONB column
    await ctx.integrations.camp_db.execute(`
      ALTER TABLE camp201_campers
      ADD COLUMN IF NOT EXISTS ice_breaker_answers JSONB DEFAULT '{}'::jsonb
    `, undefined, { label: "Add ice_breaker_answers column" });

    // Remove the old "Camper Trivia Form" pre-work item (item_key = 'ice_breaker_survey')
    await ctx.integrations.camp_db.execute(`
      DELETE FROM camp201_journey_content WHERE item_key = 'ice_breaker_survey'
    `, undefined, { label: "Remove old trivia form item" });

    // Check if registration item already exists
    const existing = await ctx.integrations.camp_db.query(
      "SELECT id FROM camp201_journey_content WHERE item_key = 'complete_registration' LIMIT 1",
      z.object({ id: z.coerce.number() }),
      undefined,
      { label: "Check registration item" }
    );

    if (existing.length === 0) {
      // Add "Complete Registration & Profile" as first item
      await ctx.integrations.camp_db.execute(
        `INSERT INTO camp201_journey_content (section, tab, sort_order, icon, title, content, tip, links, is_checkable, item_key)
         VALUES ('prework', NULL, 0, 'user-check', $1, $2, $3, '[]'::jsonb, true, 'complete_registration')`,
        [
          "Complete Registration & Profile",
          "Complete your full cAMP profile — name, role, bio, goals, fun fact, and all 16 ice breaker questions. Your ice breaker answers power team activities during cAMP, so have fun with them! Your profile is your cAMPer identity.",
          "Includes: bio, fun fact, LinkedIn, 3 goals, and 16 ice breaker questions",
        ],
        { label: "Seed registration pre-work item" }
      );
    }

    // Delete test completion data
    await ctx.integrations.camp_db.execute(`
      DELETE FROM camp201_prework WHERE item = 'calendar_invites' AND user_id = 67
    `, undefined, { label: "Clean up test completion" });

    return { success: true };
  },
});
