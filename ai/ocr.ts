// Lab-report OCR + structured extraction.
// Uses OpenAI vision when OPENAI_API_KEY is configured; otherwise returns
// `available: false` so the UI falls back to manual confirmation/entry.
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

export async function extractLabs(signedUrl: string, mimeType?: string): Promise<OcrResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { available: false, reason: "no_ocr_provider", results: [] };
  }
  if (mimeType && !IMAGE_TYPES.includes(mimeType)) {
    // Vision API needs an image; PDFs require pre-rasterization (future milestone).
    return { available: false, reason: "unsupported_for_ocr", results: [] };
  }

  const prompt = `You are a careful medical-document transcriber. Extract laboratory biomarker
results from this image. Return STRICT JSON: {"results":[{"name":string,"value":number,
"unit":string|null,"refLow":number|null,"refHigh":number|null,"date":"YYYY-MM-DD"|null}]}.
Only include values you can read with confidence. Do not infer or diagnose. If none, return {"results":[]}.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: signedUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      return { available: false, reason: `provider_error_${res.status}`, results: [] };
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const results: ExtractedLab[] = Array.isArray(parsed?.results) ? parsed.results : [];
    return { available: true, results, rawText: content };
  } catch (e) {
    return { available: false, reason: `ocr_failed:${(e as Error).message}`, results: [] };
  }
}
