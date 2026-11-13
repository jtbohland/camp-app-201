import { api, z, postgres } from "@superblocksteam/sdk-api";
import { RawRoles, parseRoles } from "../../lib/blackouts.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const SessionBankItemSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.coerce.number(),
  session_type: z.string(),
  created_by: z.string().nullable(),
  is_blackout: z.boolean(),
  blackout_roles: z.array(z.string()),
  /** Slide decks / resource links shown on every tile scheduled from this session. */
  links: z.array(z.object({ title: z.string(), url: z.string() })),
});

const BankRow = SessionBankItemSchema.omit({ links: true }).extend({ blackout_roles: RawRoles });
const LinkRow = z.object({ session_bank_id: z.coerce.number(), title: z.string(), url: z.string() });

export default api({
  name: "GetSessionBank",
  description: "Fetches all sessions in the reusable session bank",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    sessions: z.array(SessionBankItemSchema),
  }),
  async run(ctx) {
    const sessions = await ctx.integrations.camp_201_db.query(
      `SELECT id, title, description, duration_minutes, session_type, created_by,
              COALESCE(is_blackout, false) AS is_blackout, COALESCE(blackout_roles, '[]'::jsonb)::text AS blackout_roles
       FROM camp201_session_bank
       ORDER BY title ASC
       LIMIT 200`,
      BankRow,
      undefined,
      { label: "Fetch session bank" }
    );

    const links = await ctx.integrations.camp_201_db.query(
      `SELECT session_bank_id, title, url FROM camp201_session_links ORDER BY session_bank_id, sort_order, id LIMIT 1000`,
      LinkRow,
      undefined,
      { label: "Fetch session links" }
    );
    const byBank = new Map<number, { title: string; url: string }[]>();
    for (const l of links) byBank.set(l.session_bank_id, [...(byBank.get(l.session_bank_id) ?? []), { title: l.title, url: l.url }]);

    return {
      sessions: sessions.map((s) => ({ ...s, blackout_roles: parseRoles(s.blackout_roles), links: byBank.get(s.id) ?? [] })),
    };
  },
});
