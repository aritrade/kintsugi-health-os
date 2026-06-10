// One-off: render docs/pitch-deck.html -> docs/pitch-deck.pdf (1280x720 slides).
import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const html = resolve("docs/pitch-deck.html");
const out = resolve("docs/pitch-deck.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(html).href, { waitUntil: "networkidle" });
await page.pdf({
  path: out,
  printBackground: true,
  preferCSSPageSize: true,
});
await browser.close();
console.log("wrote", out);
