// One-off: render docs/explainer.html -> docs/explainer.mp4 (1080p, narrated).
// Pipeline: macOS `say` TTS per scene -> aligned narration track -> Playwright
// screen recording of the animated HTML -> ffmpeg mux + poster frame.
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VOICE = "Reed (English (US))";
const LEAD = 0.7; // matches page LEAD (700ms)
const END = 2.6; // matches page END (2600ms)
const GAP = 0.7; // pause after each line before the next scene
const FLOOR = 3.2; // minimum seconds a scene stays on screen

// One narration line per scene, in DOM order.
const lines = [
  "Your health leaves a trail. Sleep, symptoms, labs, the days you felt off.",
  "But it's scattered across portals and apps, and no one sees the whole picture. So we google, and we worry.",
  "Kintsugi changes the question, from what's wrong with me, to what's actually going on. A ninety second check-in builds your record.",
  "A deterministic Health Detective finds the patterns and correlations in your data, and frames them as questions to investigate, never verdicts.",
  "Test a theory with a simple experiment. And when you see a doctor, walk in with a clear, evidence based case, so ten minutes finally count.",
  "It even guides your nutrition, translating your labs and symptoms into evidence based foods, each one with the reasoning, an evidence grade, and built in safety checks.",
  "It's private by design, and it's yours. Export everything, or delete it all, anytime.",
  "Kintsugi Health OS. Investigation, not diagnosis. Try the live demo today.",
];

const ff = "ffmpeg";
const ffprobe = "ffprobe";
const tmp = mkdtempSync(join(tmpdir(), "kintsugi-vid-"));
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
const dur = (f) =>
  parseFloat(
    sh(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", f])
      .toString()
      .trim(),
  );

// 1) TTS each line and measure duration -> compute per-scene holds.
const holds = [];
const padded = [];
for (let i = 0; i < lines.length; i++) {
  const aiff = join(tmp, `seg${i}.aiff`);
  sh("say", ["-v", VOICE, "-o", aiff, lines[i]]);
  const d = dur(aiff);
  const hold = Math.max(d + GAP, FLOOR);
  holds.push(Math.round(hold * 10) / 10);
  const pad = join(tmp, `pad${i}.wav`);
  sh(ff, ["-y", "-i", aiff, "-ar", "44100", "-ac", "2", "-af", "apad", "-t", String(hold), pad]);
  padded.push(pad);
}

// 2) Lead silence + padded segments -> narration.wav
const lead = join(tmp, "lead.wav");
sh(ff, ["-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-t", String(LEAD), lead]);
const list = join(tmp, "list.txt");
writeFileSync(list, [lead, ...padded].map((p) => `file '${p}'`).join("\n"));
const narration = join(tmp, "narration.wav");
sh(ff, ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", narration]);
const audioLen = dur(narration);
const total = audioLen + END;
console.log("holds:", holds.join(","), "| audio:", audioLen.toFixed(2), "s | total:", total.toFixed(2), "s");

// 3) Record the animated HTML at 1920x1080 for `total` seconds.
const html = resolve("docs/explainer.html");
const url = pathToFileURL(html).href + "?d=" + holds.join(",");
const browser = await chromium.launch({ args: ["--force-color-profile=srgb"] });
const ctx = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: tmp, size: { width: 1920, height: 1080 } },
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "load" });
await page.waitForTimeout(Math.ceil(total * 1000) + 300);
await ctx.close();
await browser.close();
const webm = readdirSync(tmp).find((f) => f.endsWith(".webm"));
const webmPath = join(tmp, webm);

// 4) Mux video + narration -> mp4 (h264/aac, faststart).
const out = resolve("docs/explainer.mp4");
sh(ff, [
  "-y", "-i", webmPath, "-i", narration,
  "-map", "0:v:0", "-map", "1:a:0",
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30",
  "-vf", "scale=1920:1080:flags=lanczos",
  "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", out,
]);

// 5) Poster frame from the detective scene.
const posterT = LEAD + holds[0] + holds[1] + holds[2] + holds[3] * 0.55;
const poster = resolve("docs/assets/explainer-poster.png");
sh(ff, ["-y", "-ss", String(posterT), "-i", out, "-frames:v", "1", "-q:v", "2", poster]);

console.log("wrote", out);
console.log("wrote", poster);
rmSync(tmp, { recursive: true, force: true });
