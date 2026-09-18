import { Platform } from "react-native";

export type LocalEpisodeInput = {
  title: string;
  genre: string;
  premise: string;
  characters: string;
  characterReferences: string;
  worldRules: string;
  direction: string;
  previousEpisode: string;
};

export type LocalEpisode = {
  title: string;
  logline: string;
  summary: string;
  scenes: Array<{ heading: string; visualPrompt: string; narration: string; dialogue: string }>;
  continuityNotes: string[];
  nextDirection: string;
};

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    title: { type: "string" }, logline: { type: "string" }, summary: { type: "string" },
    scenes: { type: "array", minItems: 1, maxItems: 8, items: { type: "object", additionalProperties: false, properties: { heading: { type: "string" }, visualPrompt: { type: "string" }, narration: { type: "string" }, dialogue: { type: "string" } }, required: ["heading", "visualPrompt", "narration", "dialogue"] } },
    continuityNotes: { type: "array", items: { type: "string" } }, nextDirection: { type: "string" },
  },
  required: ["title", "logline", "summary", "scenes", "continuityNotes", "nextDirection"],
};

function parseJson(text: string): LocalEpisode {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let value: unknown;
  try { value = JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf("{"); const end = cleaned.lastIndexOf("}");
    if (start < 0 || end <= start) throw new Error("Model lokal tidak mengembalikan JSON episode yang valid.");
    value = JSON.parse(cleaned.slice(start, end + 1));
  }
  const candidate = value as Partial<LocalEpisode>;
  if (!candidate.title || !candidate.logline || !candidate.summary || !Array.isArray(candidate.scenes) || candidate.scenes.length === 0 || !Array.isArray(candidate.continuityNotes) || !candidate.nextDirection) {
    throw new Error("JSON dari model lokal tidak memenuhi format episode.");
  }
  return candidate as LocalEpisode;
}

export async function generateLocalEpisode(modelPath: string, input: LocalEpisodeInput): Promise<LocalEpisode> {
  if (Platform.OS === "web") throw new Error("Model lokal hanya tersedia pada APK Android custom.");
  if (!modelPath) throw new Error("Pilih file model GGUF terlebih dahulu di Pengaturan.");
  // Native-only module; never loaded by the web preview.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const llama = require("llama.rn") as typeof import("llama.rn");
  const context = await llama.initLlama({ model: modelPath, n_ctx: 2048, n_batch: 256, n_threads: 4, n_gpu_layers: 0 });
  try {
    const prompt = `You are an offline serial webtoon writer. Return ONLY valid JSON matching this schema: ${JSON.stringify(schema)}\n\nPROJECT: ${input.title}\nGENRE: ${input.genre}\nPREMISE: ${input.premise}\nCHARACTER CANON: ${input.characters || "None defined"}\nVISUAL REFERENCES: ${input.characterReferences || "None defined"}\nWORLD RULES: ${input.worldRules || "None defined"}\nPREVIOUS EPISODE: ${input.previousEpisode || "First episode"}\nUSER DIRECTION: ${input.direction || "Continue naturally"}\n\nWrite the next episode in Indonesian. Keep every scene editable. Repeat relevant appearance and wardrobe details in visualPrompt. Do not use markdown fences.`;
    const result = await context.completion({ prompt, n_predict: 2200, temperature: 0.7, json_schema: JSON.stringify(schema), jinja: true, enable_thinking: false });
    return parseJson(result.text);
  } finally {
    await context.release();
  }
}
