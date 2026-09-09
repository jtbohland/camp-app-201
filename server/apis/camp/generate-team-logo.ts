import { api, z, gemini } from "@superblocksteam/sdk-api";

const GEMINI = "9284363a-0a4f-4167-b9fb-8d8e83c589ed";

const GenerateContentResponseSchema = z.object({
  candidates: z.array(
    z.object({
      content: z.object({
        parts: z.array(
          z.object({
            text: z.string().optional(),
            inline_data: z.object({
              mime_type: z.string(),
              data: z.string(),
            }).optional(),
          }).passthrough(),
        ),
        role: z.string(),
      }),
      finishReason: z.string(),
    }),
  ),
});

export default api({
  name: "GenerateTeamLogo",
  description: "Uses Gemini to generate a team logo concept description",
  integrations: {
    gemini: gemini(GEMINI),
  },
  input: z.object({
    teamName: z.string(),
    prompt: z.string(),
    color: z.string(),
  }),
  output: z.object({
    logoDescription: z.string(),
    success: z.boolean(),
  }),
  async run(ctx, { teamName, prompt, color }) {
    const systemPrompt = `You are a creative branding designer for a corporate sales onboarding program called "cAMP 201" at Amplitude (an analytics company). The theme is camping/nature/wilderness.

Generate a detailed, vivid description of a team logo for the team "${teamName}". The team color is ${color}. The user's concept: "${prompt}".

Requirements:
- The logo should be fun, energetic, and team-spirited
- Incorporate camping/nature/wilderness elements (mountains, trees, campfires, animals, stars, trails, etc.)
- Use the team's color (${color}) as the primary color
- Make it suitable for a round badge/emblem format
- Keep it simple enough to work as a small icon
- Describe it in 2-3 sentences so someone could recreate it

Respond with ONLY the logo description, nothing else.`;

    const result = await ctx.integrations.gemini.apiRequest(
      {
        method: "POST",
        path: "/v1/models/gemini-2.5-flash:generateContent",
        body: {
          contents: [
            {
              parts: [{ text: systemPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 300,
          },
        },
      },
      { response: GenerateContentResponseSchema },
      { label: "Generate team logo concept" }
    );

    const text = result.candidates[0]?.content.parts[0]?.text ?? "";

    if (!text) {
      return { logoDescription: "Could not generate a logo description. Please try again.", success: false };
    }

    return { logoDescription: text, success: true };
  },
});
