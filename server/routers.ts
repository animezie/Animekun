import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateImage } from "./_core/imageGeneration";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";

const episodeSchema = z.object({
  title: z.string().min(1),
  logline: z.string().min(1),
  summary: z.string().min(1),
  scenes: z.array(z.object({
    heading: z.string().min(1),
    visualPrompt: z.string().min(1),
    narration: z.string().min(1),
    dialogue: z.string(),
  })).min(1).max(12),
  continuityNotes: z.array(z.string()).min(1),
  nextDirection: z.string().min(1),
});

function parseEpisodeJson(content: string) {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Model returned episode content that is not valid JSON");
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  story: router({
    generateEpisode: publicProcedure.input(z.object({
      title: z.string().min(1).max(120),
      genre: z.string().min(1).max(80),
      premise: z.string().min(1).max(2000),
      characters: z.string().max(6000).default(""),
      characterReferences: z.string().max(6000).default(""),
      worldRules: z.string().max(6000).default(""),
      previousEpisode: z.string().max(8000).default(""),
      direction: z.string().max(3000).default(""),
      language: z.string().default("Indonesian"),
    })).mutation(async ({ input }) => {
      const result = await invokeLLM({
        model: "gpt-5-mini",
        maxTokens: 2600,
        messages: [
          { role: "system", content: "You are a continuity-first serial webtoon writer. Return only valid JSON matching the requested schema. Never invent existing canon that is not supplied. Make every scene editable and keep character identity, world rules, timeline, and unresolved threads consistent." },
          { role: "user", content: `Create the next editable episode in ${input.language}.\n\nPROJECT TITLE: ${input.title}\nGENRE: ${input.genre}\nPREMISE: ${input.premise}\nCHARACTER CANON: ${input.characters || "No character canon has been defined yet; create only what the user can edit."}\nVISUAL CHARACTER REFERENCES: ${input.characterReferences || "No visual character references have been defined yet."}\nWORLD RULES: ${input.worldRules || "No world rules have been defined yet; avoid claiming fixed rules."}\nPREVIOUS EPISODE: ${input.previousEpisode || "This is the first generated episode."}\nUSER DIRECTION: ${input.direction || "Continue naturally from the established premise."}\n\nReturn JSON with title, logline, summary, scenes (heading, visualPrompt, narration, dialogue), continuityNotes, nextDirection. Every visualPrompt must repeat the relevant character appearance and wardrobe references so generated panels remain consistent. Keep narration and dialogue suitable for slideshow narration and subtitles. Do not include markdown fences.` },
        ],
        responseFormat: { type: "json_schema", json_schema: { name: "webtoon_episode", strict: true, schema: {
          type: "object", additionalProperties: false,
          properties: {
            title: { type: "string" }, logline: { type: "string" }, summary: { type: "string" },
            scenes: { type: "array", minItems: 1, maxItems: 12, items: { type: "object", additionalProperties: false, properties: { heading: { type: "string" }, visualPrompt: { type: "string" }, narration: { type: "string" }, dialogue: { type: "string" } }, required: ["heading", "visualPrompt", "narration", "dialogue"] } },
            continuityNotes: { type: "array", items: { type: "string" } }, nextDirection: { type: "string" },
          },
          required: ["title", "logline", "summary", "scenes", "continuityNotes", "nextDirection"],
        } } },
      });
      const content = result.choices[0]?.message?.content;
      if (typeof content !== "string") throw new Error("Model returned no episode content");
      const parsed = episodeSchema.safeParse(parseEpisodeJson(content));
      if (!parsed.success) throw new Error("Model response failed episode validation");
      return parsed.data;
    }),
    generatePanel: publicProcedure.input(z.object({ prompt: z.string().min(10).max(6000) })).mutation(async ({ input }) => {
      const result = await generateImage({ prompt: `Original webtoon panel. ${input.prompt}. Preserve every supplied character face, hairstyle, clothing, color, and distinctive mark exactly across panels. No text, logos, watermarks, or copyrighted characters.`, quality: "medium" });
      const url = z.union([z.string().url(), z.string().regex(/^\/manus-storage\/.+/)]).safeParse(result.url);
      if (!url.success) throw new Error("Image service returned an invalid asset URL");
      return { url: url.data };
    }),
  }),
});

export type AppRouter = typeof appRouter;
