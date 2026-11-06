import { api, z, gemini } from "@superblocksteam/sdk-api";

const GEMINI = "9284363a-0a4f-4167-b9fb-8d8e83c589ed";
const IMAGE_MODEL = "gemini-2.5-flash-image";

// Each call returns one image. The editor runs three calls in parallel, so each
// option appears as soon as it's ready and no single response gets too big.
const STYLES = [
  "bold flat vector emblem with thick clean outlines",
  "vintage national-park badge style with a simple ring border",
  "modern minimal mascot icon with a playful, energetic feel",
];

const PartSchema = z
  .object({
    text: z.string().optional(),
    inlineData: z.object({ mimeType: z.string(), data: z.string() }).optional(),
    inline_data: z.object({ mime_type: z.string(), data: z.string() }).optional(),
  })
  .passthrough();

const ResponseSchema = z
  .object({
    candidates: z
      .array(
        z
          .object({
            content: z.object({ parts: z.array(PartSchema).optional() }).passthrough().optional(),
            finishReason: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
    promptFeedback: z.object({ blockReason: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

const clean = (s: string, max: number) => s.replace(/[\r\n"`]+/g, " ").trim().slice(0, max);

export default api({
  name: "GenerateTeamLogo",
  description: "Uses Gemini to create one team logo image option",
  integrations: {
    gemini: gemini(GEMINI),
  },
  input: z.object({
    teamName: z.string(),
    prompt: z.string(),
    color: z.string(),
    variant: z.number().int().min(0).max(2),
  }),
  output: z.object({
    success: z.boolean(),
    image: z.string().nullable(),
    message: z.string(),
  }),
  async run(ctx, { teamName, prompt, color, variant }) {
    if (!ctx.user.email) return { success: false, image: null, message: "You must be signed in." };

    const name = clean(teamName, 40);
    const idea = clean(prompt, 200);
    const hex = /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#2d6a4f";
    if (!name || !idea) return { success: false, image: null, message: "Add a team name and a logo idea first." };

    const imagePrompt = `Design a team logo for "${name}", a team at cAMP 201, a camping and wilderness themed sales onboarding program.
Concept: ${idea}.
Style: ${STYLES[variant]}.
Use ${hex} as the main color with one or two complementary accents.
The team name "${name}" must appear spelled exactly like that, in large, bold, easy-to-read letters.
Center the whole logo on a plain white background with generous empty margin on every side, so nothing touches the edges and it still reads clearly when shown as a small round badge.
No photos, no mockups, no extra words or watermarks.`;

    const result = await ctx.integrations.gemini.apiRequest(
      {
        method: "POST",
        path: `/v1beta/models/${IMAGE_MODEL}:generateContent`,
        body: {
          contents: [{ role: "user", parts: [{ text: imagePrompt }] }],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1" },
            temperature: 1,
          },
        },
      },
      { response: ResponseSchema },
      { label: `Generate logo option ${variant + 1}` }
    );

    const parts = result.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      const camel = part.inlineData;
      const snake = part.inline_data;
      const data = camel?.data ?? snake?.data;
      const mime = camel?.mimeType ?? snake?.mime_type ?? "image/png";
      if (data) return { success: true, image: `data:${mime};base64,${data}`, message: "" };
    }

    const blocked = result.promptFeedback?.blockReason || result.candidates?.[0]?.finishReason;
    return {
      success: false,
      image: null,
      message: blocked && blocked !== "STOP"
        ? "Gemini couldn't draw that idea. Try wording it differently."
        : "Gemini didn't return an image. Try again.",
    };
  },
});
