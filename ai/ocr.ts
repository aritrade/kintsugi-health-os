// Lab-report OCR + structured extraction.
// Uses Google's free Gemma 3 (12B) vision model via the Gemini API when
// GEMINI_API_KEY is configured; otherwise returns `available: false` so the UI
// falls back to manual confirmation/entry. Extracted values are never trusted
// until the user confirms (docs/07 section 6).

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
const DEFAULT_MODEL = "gemma-3-12b-it";

const PROMPT = `You are a careful medical-document transcriber. Extract laboratory biomarker
results from this image. Respond with ONLY a JSON object (no markdown, no prose) of the form:
{"results":[{"name":string,"value":number,"unit":string|null,"refLow":number|null,"refHigh":number|null,"date":"YYYY-MM-DD"|null}]}
Only include values you can read with confidence. Do not infer or diagnose. If none, return {"results":[]}.`;

// Strips markdown code fences Gemma sometimes wraps JSON in.
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

export async function extractLabs(signedUrl: string, mimeType?: string): Promise<OcrResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { available: false, reason: "no_ocr_provider", results: [] };
  if (mimeType && !IMAGE_TYPES.includes(mimeType)) {
    // Vision needs an image; PDFs require pre-rasterization (future milestone).
    return { available: false, reason: "unsupported_for_ocr", results: [] };
  }

  const model = process.env.GEMMA_OCR_MODEL || DEFAULT_MODEL;

  try {
    // Gemma requires the image inline as base64 (it does not fetch URLs).
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) return { available: false, reason: `fetch_failed_${fileRes.status}`, results: [] };
    const base64 = Buffer.from(await fileRes.arrayBuffer()).toString("base64");

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
    if (!res.ok) {
      return { available: false, reason: `provider_error_${res.status}`, results: [] };
    }
    const json = await res.json();
    const text: string =
      json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
    const parsed = parseJsonLoose(text);
    const results = (Array.isArray(parsed?.results) ? parsed.results : []) as ExtractedLab[];
    return { available: true, results, rawText: text };
  } catch (e) {
    return { available: false, reason: `ocr_failed:${(e as Error).message}`, results: [] };
  }
}
