// Nimmt den Replay der App (Demo-Fahrt) als Video auf und schreibt Zeitmarken für Remotion.
// Voraussetzung: App läuft auf http://localhost:3000 (npm run dev oder start im Hauptordner).
// Aufruf: node record.mjs   → footage/replay.webm + footage/cues.json
import { chromium } from "playwright-core";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";

const URL = process.env.APP_URL ?? "http://localhost:3000";
mkdirSync("footage", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  recordVideo: { dir: "footage/tmp", size: { width: 1440, height: 900 } },
});
const t0 = Date.now();
const page = await context.newPage();
const cues = {};
const mark = (name) => { cues[name] = (Date.now() - t0) / 1000; console.log(name.padEnd(14), cues[name].toFixed(1) + "s"); };
const wait = (ms) => page.waitForTimeout(ms);
const smoothScrollTo = (selector, block = "start", offset = -24) =>
  page.evaluate(([sel, blk, off]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + off;
    window.scrollTo({ top: y, behavior: "smooth" });
  }, [selector, block, offset]);

await page.goto(URL, { waitUntil: "networkidle" });
mark("hero");
await wait(3000);

mark("click_watch");
await page.getByRole("button", { name: /Watch the agent inspect/ }).click();
await page.getByText("Inspection report").first().waitFor({ timeout: 120000 });
mark("report_ready");
await wait(4500); // Zählanimation + Durchstreichen sehen

mark("table");
await smoothScrollTo("table", "start", -330);
await wait(4000);

mark("photos");
await smoothScrollTo("#photo-demo-wall", "start", -120);
await wait(3500);

mark("compare");
await page.getByRole("button", { name: /severely scratched wood floor/ }).first().click();
await wait(6500);

mark("letter");
await page.getByRole("heading", { name: /Your reply to the landlord/ }).evaluate((el) => {
  const y = el.getBoundingClientRect().top + window.scrollY - 40;
  window.scrollTo({ top: y, behavior: "smooth" });
});
await wait(5500);
mark("end");

const video = page.video();
await context.close();
await browser.close();
renameSync(await video.path(), "footage/replay.webm");
writeFileSync("footage/cues.json", JSON.stringify(cues, null, 2));
console.log("fertig: footage/replay.webm");
