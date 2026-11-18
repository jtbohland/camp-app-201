import { z } from "@superblocksteam/sdk-api";

/** Question styles the counselor can mix during the EBR. */
export const QUESTION_TYPES = ["role", "industry", "challenger", "engagement"] as const;

export const ScriptQuestionSchema = z.object({
  question: z.string(),
  type: z.enum(QUESTION_TYPES),
  /** One short line on what a strong answer sounds like. */
  listen_for: z.string(),
});

export const ScriptSchema = z.object({
  brief: z.object({
    /** Who the counselor is playing: title, company, priorities, mindset. */
    who_you_are: z.string(),
    /** The team presenting: Amplitude account team, members and their roles. */
    who_youre_meeting: z.string(),
    /** 2–3 sentences of industry and company context the executive would care about. */
    company_context: z.string(),
    /** 3–5 things this executive cares about most in this meeting. */
    priorities: z.array(z.string()),
  }),
  sections: z.array(
    z.object({
      /** Meeting phase, e.g. "Opening & agenda". */
      phase: z.string(),
      /** Rough timing in the 30-minute meeting, e.g. "0–5 min". */
      timing: z.string(),
      questions: z.array(ScriptQuestionSchema),
    })
  ),
});

export type EbrScript = z.infer<typeof ScriptSchema>;

/** Gemini response schema (OpenAPI subset) matching ScriptSchema, so the model returns clean JSON. */
export const GEMINI_SCRIPT_SCHEMA = {
  type: "OBJECT",
  properties: {
    brief: {
      type: "OBJECT",
      properties: {
        who_you_are: { type: "STRING" },
        who_youre_meeting: { type: "STRING" },
        company_context: { type: "STRING" },
        priorities: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["who_you_are", "who_youre_meeting", "company_context", "priorities"],
    },
    sections: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          phase: { type: "STRING" },
          timing: { type: "STRING" },
          questions: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                type: { type: "STRING", enum: [...QUESTION_TYPES] },
                listen_for: { type: "STRING" },
              },
              required: ["question", "type", "listen_for"],
            },
          },
        },
        required: ["phase", "timing", "questions"],
      },
    },
  },
  required: ["brief", "sections"],
};

export type ScriptContext = {
  presentationTitle: string;
  presentationBrief: string;
  minutes: number;
  role: string;
  company: string;
  industry: string | null;
  roleNotes: string;
  teamName: string;
  members: { name: string; role: string | null }[];
  otherRoles: { name: string; role: string }[];
  teamMaterials: string[];
};

const clip = (s: string | null | undefined, max: number) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** The prompt for one counselor's role in one team's EBR. */
export function buildScriptPrompt(c: ScriptContext): string {
  const members = c.members.length
    ? c.members.map((m) => `- ${m.name}${m.role ? ` (${m.role})` : ""}`).join("\n")
    : "- (team members not listed)";
  const others = c.otherRoles.length
    ? c.otherRoles.map((o) => `- ${o.name} plays the ${o.role}`).join("\n")
    : "- (no other executives assigned yet)";
  const materials = c.teamMaterials.length ? c.teamMaterials.map((m) => `- ${m}`).join("\n") : "- (the team hasn't shared materials yet)";

  return `You are helping a sales-onboarding counselor prepare to role-play a customer executive during a practice Executive Business Review (EBR).

THE EXERCISE
${clip(c.presentationTitle, 120)}. New-hire Amplitude account teams (AE, SE, CSM/PS, SDR) present a ${c.minutes}-minute EBR to a customer's executives. They should cover: the value Amplitude has delivered, why the customer should continue the partnership, and where they can grow with Amplitude.
${clip(c.presentationBrief, 1200)}

THE COUNSELOR'S ROLE
Title: ${clip(c.role, 80)}
Company: ${clip(c.company, 80)}${c.industry ? `\nIndustry: ${clip(c.industry, 80)}` : ""}
Briefing notes from the team: ${clip(c.roleNotes, 1200) || "(none)"}

OTHER EXECUTIVES IN THE ROOM (do not duplicate their angle)
${others}

THE TEAM PRESENTING (Amplitude account team "${clip(c.teamName, 60)}")
${members}

WHAT THE TEAM HAS PREPARED
${materials}

WRITE A PREP SCRIPT
- brief.who_you_are: 2–3 sentences, second person, on who they are playing, what this executive is measured on, and their mindset going into the meeting.
- brief.who_youre_meeting: 1–2 sentences on the Amplitude team presenting (name the people and their roles when known).
- brief.company_context: 2–3 sentences of realistic industry and company context this executive would bring.
- brief.priorities: 3–5 short bullets of what this executive cares about most.
- sections: follow how a real EBR runs across ${c.minutes} minutes, in this order: Opening & agenda; Value delivered / results review; Partnership & renewal; Growth & roadmap; Next steps & close. Give each a timing like "0–5 min".
- 12 to 15 questions total, 2–4 per section. Ask them as this executive would, in first person, plainly spoken.
- Make them specific to this role's priorities, to the company and industry, and to what the team prepared. Avoid generic questions any executive could ask.
- Type each question: "role" (this title's priorities), "industry" (company or industry specific), "challenger" (pushes back, probes ROI, budget, competitors, risk, or adoption gaps; about a quarter of questions), or "engagement" (draws the team out or checks alignment).
- listen_for: one short line on what a strong answer from the team would include.
- Don't invent specific Amplitude metrics or contract numbers the team didn't provide; ask the team to supply them.`;
}
