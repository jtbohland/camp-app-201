import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const AssignmentSchema = z.object({
  id: z.coerce.number(),
  counselor_id: z.coerce.number(),
  counselor_name: z.string(),
  counselor_email: z.string(),
  counselor_photo: z.string().nullable(),
  company_name: z.string(),
  executive_role: z.string(),
  notes: z.string().nullable(),
});

export default api({
  name: "GetEBRRoleAssignments",
  description: "Gets counselor role assignments for a team's EBR presentation",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    team_id: z.number(),
  }),
  output: z.object({
    assignments: z.array(AssignmentSchema),
    available_counselors: z.array(z.object({
      id: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      photo_url: z.string().nullable(),
    })),
  }),
  async run(ctx, { presentation_id, team_id }) {
    // Get existing assignments
    const assignments = await ctx.integrations.camp_201_db.query(
      `SELECT ra.id, ra.counselor_id, ra.company_name, ra.executive_role, ra.notes,
              c.first_name || ' ' || c.last_name AS counselor_name,
              c.email AS counselor_email,
              c.photo_url AS counselor_photo
       FROM camp201_ebr_role_assignments ra
       JOIN camp201_campers c ON c.id = ra.counselor_id
       WHERE ra.presentation_id = $1 AND ra.team_id = $2
       ORDER BY ra.created_at`,
      AssignmentSchema,
      [presentation_id, team_id],
      { label: "Get EBR role assignments" }
    );

    // Get available counselors (visible for current cohort)
    const counselors = await ctx.integrations.camp_201_db.query(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.photo_url
       FROM camp201_campers c
       WHERE c.role IN ('counselor', 'admin')
       ORDER BY c.first_name`,
      z.object({
        id: z.coerce.number(),
        first_name: z.string(),
        last_name: z.string(),
        email: z.string(),
        photo_url: z.string().nullable(),
      }),
      undefined,
      { label: "Get available counselors" }
    );

    return { assignments, available_counselors: counselors };
  },
});
