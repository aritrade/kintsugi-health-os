// Lab-report OCR + structured extraction.
//
// Provider priority (privacy-first; Gemma is the primary model):
//   1. Self-hosted Ollama (OLLAMA_BASE_URL) running Gemma 4 12B - images never
//      leave your own infrastructure. Preferred for a health app.
//   2. Hosted Gemini API (GEMINI_API_KEY) with a free Gemma 4 vision model.
//   3. Claude vision (ANTHROPIC_API_KEY) - last-resort fallback only, used when
//      no Gemma tier is configured or both are unreachable/errored.
//   4. No provider -> available:false, UI falls back to manual entry.
//
// Extracted values are never trusted until the user confirms (docs/07 section 6).

export interface ExtractedLab {
  name: string;
  value: number;
  unit?: string;
  refLow?: number;
  refHigh?: number;
  date?: string;
}

export interface OcrResult {
  available: boolean;
  reason?: string;
  results: ExtractedLab[];
  rawText?: string;
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const HOSTED_DEFAULT_MODEL = "gemma-4-26b-a4b-it"; // hosted Gemini API (12B is local-only today)
const OLLAMA_DEFAULT_MODEL = "gemma4:12b"; // true Gemma 4 12B on your own box
const CLAUDE_DEFAULT_MODEL = "claude-3-5-sonnet-latest"; // vision-capable; override via CLAUDE_OCR_MODEL

const PROMPT = `You are a careful medical-document transcriber. Extract laboratory biomarker
results from this image. Respond with ONLY a JSON object (no markdown, no prose) of the form:
{"results":[{"name":string,"value":number,"unit":string|null,"refLow":number|null,"refHigh":number|null,"date":"YYYY-MM-DD"|null}]}
Only include values you can read with confidence. Do not infer or diagnose. If none, return {"results":[]}.`;

function parseJsonLoose(text: string): { results?: unknown } {
  const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return {};
      }
    }
    return {};
  }
}

function toResults(parsed: { results?: unknown }): ExtractedLab[] {
  return (Array.isArray(parsed?.results) ? parsed.results : []) as ExtractedLab[];
}

async function fetchBase64(signedUrl: string): Promise<string | null> {
  const r = await fetch(signedUrl);
  if (!r.ok) return null;
  return Buffer.from(await r.arrayBuffer()).toString("base64");
}

// Self-hosted Ollama (e.g. Gemma 4 12B on an Oracle box behind Caddy).
async function extractViaOllama(base64: string): Promise<OcrResult> {
  const base = process.env.OLLAMA_BASE_URL!.replace(/\/$/, "");
  const model = process.env.OLLAMA_OCR_MODEL || OLLAMA_DEFAULT_MODEL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.OLLAMA_OCR_TOKEN) headers.Authorization = `Bearer ${process.env.OLLAMA_OCR_TOKEN}`;

  const res = await fetch(`${base}/api/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      prompt: PROMPT,
      images: [base64],
      stream: false,
      format: "json",
      options: { temperature: 0 },
    }),
  });
  if (!res.ok) return { available: false, reason: `ollama_error_${res.status}`, results: [] };
  const json = await res.json();
  const text: string = json?.response ?? "";
  return { available: true, results: toResults(parseJsonLoose(text)), rawText: text };
}

// Hosted Gemini API with a free Gemma 4 vision model.
async function extractViaGemini(base64: string, mimeType?: string): Promise<OcrResult> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const model = process.env.GEMMA_OCR_MODEL || HOSTED_DEFAULT_MODEL;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mimeType || "image/png", data: base64 } },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    },
  );
  if (!res.ok) return { available: false, reason: `gemini_error_${res.status}`, results: [] };
  const json = await res.json();
  const parts: { text?: string; thought?: boolean }[] = json?.candidates?.[0]?.content?.parts ?? [];
  // Gemma 4 emits "thinking" parts (thought:true) before the answer; skip them.
  const text: string = parts
    .filter((p) => !p.thought)
    .map((p) => p.text ?? "")
    .join("");
  return { available: true, results: toResults(parseJsonLoose(text)), rawText: text };
}

// Claude only accepts jpeg/png/gif/webp; normalize the loose "image/jpg" alias.
function claudeMediaType(mimeType?: string): string {
  const m = (mimeType || "image/png").toLowerCase();
  return m === "image/jpg" ? "image/jpeg" : m;
}

// Claude vision (ANTHROPIC_API_KEY) - last-resort fallback only. Gemma stays the
// primary model; this path runs solely when no Gemma tier succeeded. Uses the
// REST API directly to match the dependency-free fetch pattern above.
async function extractViaClaude(base64: string, mimeType?: string): Promise<OcrResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.CLAUDE_OCR_MODEL || CLAUDE_DEFAULT_MODEL;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: claudeMediaType(mimeType), data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    }),
  });
  if (!res.ok) return { available: false, reason: `claude_error_${res.status}`, results: [] };
  const json = await res.json();
  const blocks: { type?: string; text?: string }[] = json?.content ?? [];
  const text: string = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  return { available: true, results: toResults(parseJsonLoose(text)), rawText: text };
}

export async function extractLabs(signedUrl: string, mimeType?: string): Promise<OcrResult> {
  const hasOllama = !!process.env.OLLAMA_BASE_URL;
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasClaude = !!process.env.ANTHROPIC_API_KEY;
  if (!hasOllama && !hasGemini && !hasClaude) return { available: false, reason: "no_ocr_provider", results: [] };
  if (mimeType && !IMAGE_TYPES.includes(mimeType)) {
    // Vision needs an image; PDFs require pre-rasterization (future milestone).
    return { available: false, reason: "unsupported_for_ocr", results: [] };
  }

  try {
    const base64 = await fetchBase64(signedUrl);
    if (!base64) return { available: false, reason: "fetch_failed", results: [] };

    // Tier 1 (primary): self-hosted Gemma - images never leave your own infra.
    if (hasOllama) {
      const r = await extractViaOllama(base64);
      if (r.available || (!hasGemini && !hasClaude)) return r;
    }
    // Tier 2: hosted Gemma (Gemini API).
    if (hasGemini) {
      const r = await extractViaGemini(base64, mimeType);
      if (r.available || !hasClaude) return r;
    }
    // Tier 3: Claude vision - last-resort fallback.
    return await extractViaClaude(base64, mimeType);
  } catch (e) {
    return { available: false, reason: `ocr_failed:${(e as Error).message}`, results: [] };
  }
}
