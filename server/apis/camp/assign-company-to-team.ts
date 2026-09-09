import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// Company catalog with real branding
export const COMPANY_CATALOG = [
  { slug: "doordash", name: "DoorDash", emoji: "🚗", color: "#FF3008", industry: "Food Delivery & Logistics" },
  { slug: "coursera", name: "Coursera", emoji: "🎓", color: "#0056D2", industry: "Online Education & EdTech" },
  { slug: "quickbooks", name: "Intuit QuickBooks", emoji: "💰", color: "#2CA01C", industry: "Financial Software & Accounting" },
  { slug: "zillow", name: "Zillow", emoji: "🏠", color: "#006AFF", industry: "Real Estate & PropTech" },
];

export default api({
  name: "AssignCompanyToTeam",
  description: "Assigns a company from the catalog to a team",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    team_id: z.number(),
    company_slug: z.string(),
  }),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx, { team_id, company_slug }) {
    const company = COMPANY_CATALOG.find((c) => c.slug === company_slug);
    if (!company) {
      return { success: false, message: "Company not found in catalog" };
    }

    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_teams SET assigned_company = $2::jsonb WHERE id = $1`,
      [team_id, JSON.stringify(company)],
      { label: `Assign ${company.name} to team ${team_id}` }
    );

    return { success: true, message: `${company.emoji} ${company.name} assigned to team!` };
  },
});
