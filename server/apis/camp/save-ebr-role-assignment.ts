import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SaveEBRRoleAssignment",
  description: "Assigns a counselor an executive role for a team's EBR presentation",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    team_id: z.number(),
    counselor_id: z.number(),
    company_name: z.string(),
    executive_role: z.string(),
    notes: z.string().nullable(),
    assigned_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), id: z.coerce.number() }),
  async run(ctx, { presentation_id, team_id, counselor_id, company_name, executive_role, notes, assigned_by }) {
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_ebr_role_assignments (presentation_id, team_id, counselor_id, company_name, executive_role, notes, assigned_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (presentation_id, team_id, counselor_id)
       DO UPDATE SET company_name = $4, executive_role = $5, notes = $6, updated_at = NOW()
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [presentation_id, team_id, counselor_id, company_name, executive_role, notes ?? "", assigned_by],
      { label: "Upsert EBR role assignment" }
    );
    return { success: true, id: result[0].id };
  },
});
