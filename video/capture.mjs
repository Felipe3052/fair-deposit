// Deterministische 2x-Aufnahme der App (Produktions-Build) für das Demo-Video.
// Zeit läuft virtuell (CDP Emulation.setVirtualTimePolicy): jedes Bild = exakt 1/30 s, unabhängig von der Rechenleistung.
// Ergebnis: footage/agent.mp4, compare.mp4, letter.mp4 (2880x1620, 30 fps) + Standbilder public/still-*.png + footage/cues.json (Zielrechtecke)
// Voraussetzung: `npm run build && npx next start -p 3100` im Hauptordner.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, copyFileSync } from "node:fs";
import { once } from "node:events";

const URL = process.env.APP_URL ?? "http://localhost:3100";
const FPS = 30;
const FRAME_MS = 1000 / FPS;
mkdirSync("footage", { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 2, locale: "en-US" });
const page = await context.newPage();
await page.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal{display:none!important} #fc{position:fixed;left:-60px;top:-60px;width:30px;height:30px;z-index:99999;pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}";
    document.head.appendChild(style);
    const d = document.createElement("div");
    d.id = "fc";
    d.innerHTML = '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M4 2l7 18 2.6-7.4L21 10z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    document.body.appendChild(d);
    // Unsichtbarer Dauer-Animator: erzwingt in jedem virtuellen Zeitschritt ein neues Bild, auch bei ruhender Seite.
    const tick = document.createElement("div");
    tick.style.cssText = "position:fixed;left:0;bottom:0;width:3px;height:3px;opacity:.03;background:#000;z-index:99998;pointer-events:none;animation:tk .2s linear infinite alternate";
    const tk = document.createElement("style");
    tk.textContent = "@keyframes tk{from{transform:translateX(0)}to{transform:translateX(40px)}}";
    document.head.appendChild(tk);
    document.body.appendChild(tick);
    addEventListener("mousemove", (e) => { d.style.left = e.clientX - 4 + "px"; d.style.top = e.clientY - 2 + "px"; });
  });
});
await page.goto(`${URL}?speed=2`, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const client = await context.newCDPSession(page);
await client.send("Emulation.setVirtualTimePolicy", { policy: "pause" });

async function advance(ms) {
  const done = new Promise((res) => client.once("Emulation.virtualTimeBudgetExpired", res));
  await client.send("Emulation.setVirtualTimePolicy", { policy: "pauseIfNetworkFetchesPending", budget: ms });
  await done;
}

function encoder(name) {
  const p = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-pix_fmt", "yuv420p", "-vf", "setsar=1", `footage/${name}.mp4`], { stdio: ["pipe", "inherit", "inherit"] });
  return p;
}
let frameNo = 0;
async function frame(enc) {
  await advance(FRAME_MS);
  const buf = await page.screenshot({ type: "jpeg", quality: 100 });
  if (!enc.stdin.write(buf)) await once(enc.stdin, "drain");
  frameNo++;
}
async function end(enc) { enc.stdin.end(); await once(enc, "close"); }
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
async function moveMouse(enc, from, to, frames) {
  for (let i = 1; i <= frames; i++) {
    const e = ease(i / frames);
    await page.mouse.move(from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e);
    await frame(enc);
  }
}
async function hold(enc, frames) { for (let i = 0; i < frames; i++) await frame(enc); }
async function scrollTo(enc, y0, y1, frames) {
  for (let i = 1; i <= frames; i++) {
    await page.evaluate((y) => window.scrollTo(0, y), y0 + (y1 - y0) * ease(i / frames));
    await frame(enc);
  }
}
const center = (r) => [r.x + r.width / 2, r.y + r.height / 2];
const rect = async (loc) => loc.first().evaluate((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
const rects = async (sel) => page.locator(sel).evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; }));
const still = async (name) => { await page.screenshot({ path: `public/still-${name}.png`, type: "png" }); };

const cues = { fps: FPS, viewport: { width: 1440, height: 810 } };

// ---------- Hero (Standbild + Zielrechtecke) ----------
await page.mouse.move(120, 700);
await still("hero");
cues.hero = {
  headline: await rect(page.locator("h2").first()),
  watchButton: await rect(page.getByRole("button", { name: /Watch the agent inspect/ })),
  steps: await rect(page.locator("ol").first()),
};
console.log("hero ok");

// ---------- Take A: Klick + Agent-Lauf + Reveal ----------
{
  const enc = encoder("agent");
  await hold(enc, 12);
  const btn = center(cues.hero.watchButton);
  await moveMouse(enc, [120, 700], btn, 36);
  await hold(enc, 6);
  await page.mouse.down(); await page.mouse.up();
  cues.agentClickFrame = frameNo;
  let ready = false, f = 0;
  while (!ready && f < 40 * FPS) {
    await frame(enc); f++;
    if (f === 24) await page.evaluate(() => { const d = document.getElementById("fc"); d.style.transition = "opacity .5s"; d.style.opacity = "0"; });
    if (f % 5 === 0) ready = (await page.getByRole("heading", { name: "Inspection report" }).count()) > 0;
  }
  cues.agentReportFrame = f;
  await hold(enc, 7 * FPS);
  await end(enc);
  console.log("agent ok", cues.agentReportFrame / FPS, "s bis Bericht");
  writeFileSync("footage/agent-cues.json", JSON.stringify({ agentClickFrame: cues.agentClickFrame, agentReportFrame: cues.agentReportFrame }));
  await browser.close();
  process.exit(0);
}
await page.mouse.move(1000, 900);
await page.evaluate(() => window.scrollTo(0, 0));
await advance(FRAME_MS);
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
  stepsPanel: await rect(page.locator("aside section").first()),
  findingsPanel: await rect(page.locator("aside section").nth(0)),
};
console.log("report ok");

// ---------- Take C: Befund anklicken → Vorher/Nachher ----------
{
  const finding = page.getByRole("button", { name: /severely scratched wood floor/ }).first();
  await finding.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await advance(FRAME_MS);
  const fr = await rect(finding);
  const enc = encoder("compare");
  await page.mouse.move(1100, 760);
  await hold(enc, 15);
  await moveMouse(enc, [1100, 760], center(fr), 26);
  await hold(enc, 5);
  await page.mouse.down(); await page.mouse.up();
  await hold(enc, 6 * FPS);
  await end(enc);
  console.log("compare ok");
}
await advance(FRAME_MS);
await still("compare");
const ba = page.locator("#before-after");
cues.compare = {
  panel: await rect(ba),
  banner: await rect(ba.locator("div").first()),
  imgs: await rects("#before-after img"),
};

// ---------- Take D: Brief ----------
{
  await page.evaluate(() => window.scrollTo(0, 0));
  await advance(FRAME_MS);
  const head = page.getByRole("heading", { name: /Your reply to the landlord/ });
  const y1 = await head.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 28);
  const enc = encoder("letter");
  await hold(enc, 12);
  await scrollTo(enc, 0, y1, 66);
  await hold(enc, 12);
  await scrollTo(enc, y1, y1 + 360, 120);
  await hold(enc, 20);
  await end(enc);
  cues.letter = {
    scrollY: y1,
    heading: await rect(head),
    pdfButton: await rect(page.getByRole("button", { name: /Evidence report \(PDF\)/ })),
    copyButton: await rect(page.getByRole("button", { name: /^Copy$/ })),
  };
  console.log("letter ok");
}
await still("letter");
writeFileSync("footage/cues.json", JSON.stringify(cues, null, 2));
await browser.close();
console.log("fertig");
