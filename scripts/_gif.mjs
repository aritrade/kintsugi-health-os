// One-off: regenerate docs/assets/overview.gif from the LIVE demo, now including
// the Nutrition Intelligence page. Logs into the shared demo account, screenshots
// key pages, and assembles a looping GIF with ffmpeg (palette + transdiff).
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const BASE = process.env.GIF_BASE || "https://kintsugi-health-os.vercel.app";
const W = 1000, H = 640;
const HOLD = 2.6; // seconds per frame
const tmp = mkdtempSync(join(tmpdir(), "kintsugi-gif-"));
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

const pages = [
  { path: "/dashboard", wait: "text=Health Momentum" },
  { path: "/graph", wait: "svg, canvas" },
  { path: "/nutrition", wait: "text=Assessment" },
  { path: "/reports", wait: "main" },
  { path: "/cases", wait: "main" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Explore the live demo/i }).click();
await page.waitForURL("**/dashboard", { timeout: 30000 });
await page.waitForTimeout(1500);

const frames = [];
for (let i = 0; i < pages.length; i++) {
  const { path, wait } = pages[i];
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector(wait, { timeout: 8000 });
  } catch {}
  await page.waitForTimeout(1200);
  const f = join(tmp, `f${i}.png`);
  await page.screenshot({ path: f, clip: { x: 0, y: 0, width: W, height: H } });
  frames.push(f);
  console.log("captured", path);
}
await ctx.close();
await browser.close();

// Assemble looping GIF (concat demuxer with per-frame duration -> palette).
const list = join(tmp, "list.txt");
const lines = [];
for (const f of frames) {
  lines.push(`file '${f}'`);
  lines.push(`duration ${HOLD}`);
}
lines.push(`file '${frames[frames.length - 1]}'`); // concat needs last repeated
writeFileSync(list, lines.join("\n"));

const palette = join(tmp, "palette.png");
const vf = "fps=12,scale=900:-1:flags=lanczos";
sh("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", `${vf},palettegen=stats_mode=diff`, palette]);
const out = resolve("docs/assets/overview.gif");
sh("ffmpeg", [
  "-y", "-f", "concat", "-safe", "0", "-i", list, "-i", palette,
  "-lavfi", `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3`,
  "-gifflags", "+transdiff", "-loop", "0", out,
]);
console.log("wrote", out);
rmSync(tmp, { recursive: true, force: true });
