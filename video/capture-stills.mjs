// Hochauflösende Standbilder (2x) und Zielrechtecke der App im Berichtszustand — Echtzeit, ohne virtuelle Zeit.
// Voraussetzung: `npm run build && npx next start -p 3100` im Hauptordner. Erzeugt public/still-*.png und src/cues.json.
// (Der Agent-Lauf selbst wird von capture.mjs frameweise aufgenommen: footage/agent.mp4.)
import { chromium } from "playwright-core";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const URL = process.env.APP_URL ?? "http://localhost:3100";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2, locale: "en-US" });
const page = await context.newPage();
page.setDefaultTimeout(30000);
await page.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(style);
  });
});
await page.goto(`${URL}?speed=10`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const log = (m) => console.log(m);
const rect = async (loc) => loc.first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const rects = async (sel) => page.locator(sel).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
const still = async (name) => { await page.screenshot({ path: `public/still-${name}.png`, type: "png" }); };
const settle = (ms = 900) => page.waitForTimeout(ms);

const cues = { fps: 30, viewport: { width: 1440, height: 810 } };
// Aus der frameweisen Aufnahme (capture.mjs): Klick bei Frame 54, Bericht 700 Frames (23,3 s) danach.
const prev = existsSync("footage/agent-cues.json") ? JSON.parse(readFileSync("footage/agent-cues.json", "utf8")) : {};
cues.agentClickFrame = prev.agentClickFrame ?? 54;
cues.agentReportFrame = prev.agentReportFrame ?? 700;

await page.mouse.move(1400, 800);
await settle(500);
await still("hero");
cues.hero = {
  mascot: await rect(page.locator("img[alt*='mascot']").first()),
  headline: await rect(page.locator("h2").first()),
  watchButton: await rect(page.getByRole("button", { name: /Watch the agent inspect/ })),
  steps: await rect(page.locator("ol").first()),
};
log("hero ok");

await page.getByRole("button", { name: /Watch the agent inspect/ }).click();
await page.getByRole("heading", { name: "Inspection report" }).waitFor({ timeout: 120000 });
await settle(5000); // Zählanimation fertig
await page.mouse.move(1000, 900);
await page.evaluate(() => window.scrollTo(0, 0));
await settle();
await still("report");
cues.report = {
  cards: await rects(".rise-in"),
  table: await rect(page.locator("table")),
  rows: await rects("tbody tr"),
  photos: {
    wall: await rect(page.locator("#photo-demo-wall")),
    floor: await rect(page.locator("#photo-demo-floor")),
    back: await rect(page.locator("#photo-demo-back-wall")),
  },
};
log("report ok");

// Befund anklicken → Vorher/Nachher-Panel (die App scrollt selbst dorthin)
await page.getByRole("button", { name: /severely scratched wood floor/ }).first().click();
await settle(1800);
await page.mouse.move(1000, 900);
await still("compare");
const ba = page.locator("#before-after");
cues.compare = {
  panel: await rect(ba),
  banner: await rect(ba.locator("div").first()),
  imgs: await rects("#before-after img"),
};
log("compare ok");

// Antwortbrief
await page.evaluate(() => window.scrollTo(0, 0));
await settle(400);
const head = page.getByRole("heading", { name: /Your reply to the landlord/ });
const y1 = await head.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 28);
await page.evaluate((y) => window.scrollTo(0, y), y1);
await settle();
await still("letter");
cues.letter = {
  heading: await rect(head),
  pdfButton: await rect(page.getByRole("button", { name: /Evidence report \(PDF\)/ })),
  box: await rect(page.locator("textarea, [class*='whitespace-pre']").first()).catch(() => null),
};
await page.evaluate((y) => window.scrollTo(0, y), y1 + 380);
await settle();
await still("letter-end");
log("letter ok");

writeFileSync("src/cues.json", JSON.stringify(cues, null, 2));
await browser.close();
log("fertig");
