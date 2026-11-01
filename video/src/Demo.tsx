import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Bubble, Camera, Key, R, Ring, Still, Take, fit, part, union, wide } from "./camera";
import { MascotBeat, MascotStatic } from "./Mascot";
import { Backdrop, Chip, Disclosure, Fade } from "./parts";
import { C, FONT } from "./theme";
import cues from "./cues.json";

export const FPS = 30;
const sec = (s: number) => Math.round(s * FPS);

// Szenengrenzen (Sekunden) nach docs/VOICEOVER.md und den echten Sprechzeiten
const T = { hook: 0, stack: 13, agent: 26, compare: 57, calc: 76, letter: 106, arch: 119, outro: 137, end: 149 };
export const TOTAL_FRAMES = sec(T.end);
const dur = (a: keyof typeof T, b: keyof typeof T) => sec(T[b] - T[a]);
const scene = (a: keyof typeof T, b: keyof typeof T) => ({ from: sec(T[a]), durationInFrames: dur(a, b) });

const VO: React.FC<{ file: string }> = ({ file }) => (
  <Sequence from={9}><Audio src={staticFile(file)} /></Sequence>
);

const Title: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 84, color = C.ink }) => (
  <div style={{ fontSize: size, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color, fontFamily: FONT }}>{children}</div>
);

const k = cues as unknown as {
  hero: { mascot: R; headline: R; watchButton: R; steps: R };
  agentClickFrame: number;
  agentReportFrame: number;
  report: { cards: R[]; table: R; rows: R[]; photos: { wall: R; floor: R; back: R } };
  compare: { panel: R; banner: R; imgs: R[] };
  letter: { heading: R; pdfButton: R };
};

const NOTE = "Recorded run of a real agent session · demo photos partly synthetic (Muse Image)";

/** Hook: Hero-Standbild, ruhige Kamerafahrt auf Forderung und Knopf. */
const Hook: React.FC = () => (
  <Backdrop>
    <VO file="01-hook.mp3" />
    <Camera keys={[wide(0), wide(40), fit(100, k.hero.headline, { pad: 1.3, maxZ: 1.4 }), fit(210, k.hero.headline, { pad: 1.3, maxZ: 1.4 }), fit(270, k.hero.watchButton, { pad: 2.6, maxZ: 1.35 }), fit(340, k.hero.watchButton, { pad: 2.6, maxZ: 1.35 }), wide(389)]}>
      <Still file="still-hero.png">
        <Ring r={k.hero.headline} at={95} until={205} color={C.rust} label="The claim" labelBelow />
        <Bubble near={k.hero.mascot} text="Is that fair?" at={10} duration={72} />
      </Still>
    </Camera>
  </Backdrop>
);

/** Stack-Folie. */
const Stack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    { t: "Muse Spark", d: "The agent: vision, tool calling, verification", c: C.green },
    { t: "SAM 3.1", d: "Pixel-accurate masks as visual evidence", c: C.rust },
    { t: "Open weights", d: "Spark Open on Baseten runs the whole agent", c: C.blue },
    { t: "Code, not the model", d: "Rules are data, the math is code", c: C.sage },
  ];
  return (
    <Backdrop>
      <VO file="02-stack.mp3" />
      <div style={{ position: "absolute", left: 110, top: 100 }}>
        <Title>Built on Meta&apos;s models</Title>
        <div style={{ marginTop: 56, display: "grid", gap: 22, width: 1180 }}>
          {items.map((it, i) => {
            const s = spring({ frame: frame - 40 - i * 36, fps, config: { damping: 200 } });
            return (
              <div key={it.t} style={{ opacity: s, transform: `translateX(${(1 - s) * 60}px)`, background: C.card, borderRadius: 24, padding: "26px 34px", display: "flex", alignItems: "center", gap: 28, boxShadow: "0 10px 30px rgba(32,40,33,0.1)" }}>
                <div style={{ width: 18, alignSelf: "stretch", borderRadius: 9, background: it.c }} />
                <div>
                  <div style={{ fontSize: 44, fontWeight: 700, color: C.ink }}>{it.t}</div>
                  <div style={{ fontSize: 28, color: C.muted, marginTop: 4 }}>{it.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 110, bottom: 52, fontSize: 24, color: C.muted, fontFamily: FONT }}>The next scenes are a recorded run of a real agent session.</div>
      <MascotBeat at={8} text="Built on Meta!" duration={64} />
    </Backdrop>
  );
};

const AGENT_FRAMES = k.agentClickFrame + k.agentReportFrame + 210;

/** Agent-Lauf (2x-Aufnahme, 1,0x) mit ruhigen Fahrten auf Fotos, Masken und Bericht. */
const Agent: React.FC = () => {
  const c = k.agentClickFrame;
  const photos = union(k.report.photos.wall, k.report.photos.floor, k.report.photos.back);
  // Zeiten aus der echten Aufnahme (Videosekunden): Klick 1,8 · Inspektion 3-10 · Zoom 10-14 · SAM-Masken ab 15 · Zweiter Blick ab 17 · Vergleich ab 19 · Bericht 25,1
  const keys: Key[] = [
    wide(0),
    wide(c + 20),
    fit(sec(4.8), photos, { pad: 1.1, maxZ: 1.25 }),
    fit(sec(14.2), photos, { pad: 1.1, maxZ: 1.25 }),
    fit(sec(15.6), k.report.photos.floor, { pad: 1.12, maxZ: 1.5 }),
    fit(sec(16.9), k.report.photos.floor, { pad: 1.12, maxZ: 1.5 }),
    fit(sec(17.8), k.report.photos.back, { pad: 1.12, maxZ: 1.5 }),
    fit(sec(19.0), k.report.photos.back, { pad: 1.12, maxZ: 1.5 }),
    wide(sec(20.2)),
    wide(sec(24.4)),
    fit(sec(26.2), union(...k.report.cards), { pad: 1.1, maxZ: 1.4 }),
    fit(920, union(...k.report.cards), { pad: 1.1, maxZ: 1.4 }),
  ];
  return (
    <Backdrop>
      <VO file="03-agent.mp3" />
      <Camera keys={keys}>
        <Take file="agent.mp4" frames={AGENT_FRAMES} />
      </Camera>
      <Chip n={1} text="Spark inspects and zooms" at={sec(3.4)} />
      <Chip n={2} text="SAM 3.1 draws the proof" at={sec(15)} />
      <Chip n={3} text="Second look rejects false alarms" at={sec(17.4)} />
      <Chip text="Verified: totals recomputed in code" at={sec(26)} />
      <MascotBeat at={c + 8} text="Let's inspect!" duration={60} />
      <Disclosure text={NOTE} />
    </Backdrop>
  );
};

/** Einzugsvergleich: Klick auf den Befund, dann Fahrt auf Vorher/Nachher. */
const Compare: React.FC = () => {
  const [moveIn, moveOut] = k.compare.imgs;
  const keys: Key[] = [
    wide(0),
    wide(30),
    fit(90, k.compare.panel, { pad: 1.02, maxZ: 1.12 }),
    fit(200, moveIn, { pad: 1.12, maxZ: 1.45 }),
    fit(330, moveIn, { pad: 1.12, maxZ: 1.45 }),
    fit(380, moveOut, { pad: 1.12, maxZ: 1.45 }),
    fit(470, moveOut, { pad: 1.12, maxZ: 1.45 }),
    fit(520, k.compare.banner, { pad: 1.08, maxZ: 1.5 }),
    fit(569, k.compare.banner, { pad: 1.08, maxZ: 1.5 }),
  ];
  return (
    <Backdrop>
      <VO file="04-compare.mp3" />
      <Camera keys={keys}>
        <Still file="still-compare.png">
          <Ring r={moveIn} at={205} until={335} color={C.blue} label="Move-in: already scratched" />
          <Ring r={moveOut} at={385} until={475} color={C.rust} label="Move-out: same damage" />
        </Still>
      </Camera>
      <Chip n={1} text="Compare with the move-in photos" at={8} />
      <Chip text="The floor was already scratched" at={sec(8)} />
      <MascotBeat at={sec(12.2)} text="Not my damage!" duration={62} />
      <Disclosure text={NOTE} />
    </Backdrop>
  );
};

/** Rechnung: Bericht als Standbild; Kamera folgt dem gesprochenen Text Zeile für Zeile. */
const Calc: React.FC = () => {
  const [claims, share] = k.report.cards;
  const [row0, row1, row2] = k.report.rows;
  const z = { pad: 1.06, maxZ: 1.5 };
  const keys: Key[] = [
    wide(0),
    wide(sec(5.8)),
    fit(sec(7.2), part(row0, "left"), z),
    fit(sec(11.0), part(row0, "left"), z),
    fit(sec(12.2), part(row0, "right"), z),
    fit(sec(15.0), part(row0, "right"), z),
    fit(sec(16.3), part(row1, "left"), z),
    fit(sec(17.8), part(row1, "left"), z),
    fit(sec(18.4), part(row1, "right"), z),
    fit(sec(19.5), part(row1, "right"), z),
    fit(sec(20.4), part(row2, "left"), z),
    fit(sec(21.4), part(row2, "left"), z),
    fit(sec(21.9), part(row2, "right"), z),
    fit(sec(23.0), part(row2, "right"), z),
    fit(sec(24.1), claims, { pad: 1.5, maxZ: 1.5 }),
    fit(sec(26.0), claims, { pad: 1.5, maxZ: 1.5 }),
    fit(sec(26.7), share, { pad: 1.5, maxZ: 1.5 }),
    fit(sec(28.9), share, { pad: 1.5, maxZ: 1.5 }),
    wide(sec(29.9)),
  ];
  return (
    <Backdrop>
      <VO file="05-calc.mp3" />
      <Camera keys={keys}>
        <Still file="still-report.png">
          <Ring r={k.report.rows[0]} at={sec(8)} until={sec(15.8)} color={C.rust} label="Paint: 3.8 of 5 years → 24% residual → $144" />
          <Ring r={k.report.rows[1]} at={sec(17)} until={sec(19.4)} color={C.blue} label="Already at move-in → $0" />
          <Ring r={k.report.rows[2]} at={sec(20.3)} until={sec(23)} color={C.sage} label="No evidence → $0" />
          <Ring r={claims} at={sec(24.6)} until={sec(26.6)} color={C.rust} label="Claimed: $1,800" />
          <Ring r={share} at={sec(26.6)} until={sec(29.6)} color={C.green} label="Fair share: $144" />
        </Still>
      </Camera>
      <Chip text="Rules are data" at={sec(2)} />
      <Chip text="Every number recomputed in code" at={sec(20.6)} duration={75} />
      <MascotBeat at={sec(26.8)} text="$144 — not $1,800" duration={68} />
      <Disclosure text={NOTE} />
    </Backdrop>
  );
};

/** Brief: Standbilder (Briefkopf, dann Summe) mit ruhiger Überblendung und Fokus auf Text und PDF-Knopf. */
const Letter: React.FC = () => {
  const frame = useCurrentFrame();
  const endOpacity = interpolate(frame, [sec(5.2), sec(6.4)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const keys: Key[] = [
    wide(0),
    wide(20),
    fit(60, k.letter.heading, { pad: 1.5, maxZ: 1.15 }),
    fit(sec(4.6), k.letter.pdfButton, { pad: 3.4, maxZ: 1.4 }),
    fit(sec(6.2), union(k.letter.heading), { pad: 1.5, maxZ: 1.1 }),
    { f: 389, cx: 0.5, cy: 0.5, z: 1.2 },
  ];
  return (
    <Backdrop>
      <VO file="06-letter.mp3" />
      <Camera keys={keys}>
        <Still file="still-letter.png">
          <Ring r={k.letter.pdfButton} at={sec(4)} until={sec(6.2)} color={C.green} label="Evidence report (PDF)" labelBelow />
        </Still>
        <div style={{ position: "absolute", inset: 0, opacity: endOpacity }}>
          <Still file="still-letter-end.png" />
        </div>
      </Camera>
      <Chip n={1} text="Reply letter with the evidence" at={10} />
      <Chip text="Plus a PDF evidence report" at={sec(4.2)} />
      <Disclosure text={NOTE} />
    </Backdrop>
  );
};

/** Architektur-Folie. */
const Arch: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const nodes = [
    { x: 90, y: 330, w: 270, t: "Move-out +\nmove-in photos", c: C.sage },
    { x: 440, y: 330, w: 330, t: "Muse Spark agent\ntool-calling loop", c: C.green },
    { x: 850, y: 150, w: 290, t: "inspect + zoom", c: C.green },
    { x: 850, y: 290, w: 290, t: "SAM 3.1 masks", c: C.rust },
    { x: 850, y: 430, w: 290, t: "second look", c: C.green },
    { x: 850, y: 570, w: 290, t: "move-in compare", c: C.blue },
    { x: 1230, y: 330, w: 330, t: "Rule packs (data)\n+ fair-share math (code)", c: C.sage },
    { x: 1230, y: 560, w: 330, t: "Verified report\n+ reply letter", c: C.green },
  ];
  const lines = [
    [360, 376, 440, 376], [770, 376, 850, 196], [770, 376, 850, 336], [770, 376, 850, 476], [770, 376, 850, 616],
    [1140, 196, 1230, 376], [1140, 336, 1230, 376], [1140, 476, 1230, 376], [1140, 616, 1230, 376], [1395, 424, 1395, 560],
  ];
  return (
    <Backdrop>
      <VO file="07-arch.mp3" />
      <div style={{ position: "absolute", left: 90, top: 60 }}><Title size={64}>How it works</Title></div>
      <svg style={{ position: "absolute", inset: 0 }} width={1920} height={1080}>
        {lines.map(([x1, y1, x2, y2], i) => {
          const p = interpolate(frame, [30 + i * 9, 50 + i * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={C.sage} strokeWidth={4} strokeLinecap="round" />;
        })}
      </svg>
      {nodes.map((n, i) => {
        const s = spring({ frame: frame - 14 - i * 12, fps, config: { damping: 200 } });
        return (
          <div key={i} style={{ position: "absolute", left: n.x, top: n.y, width: n.w, minHeight: 92, borderRadius: 22, background: C.card, border: `4px solid ${n.c}`, padding: "16px 20px", fontSize: 30, fontWeight: 700, color: C.ink, whiteSpace: "pre-line", textAlign: "center", opacity: s, transform: `scale(${0.9 + 0.1 * s})`, boxShadow: "0 10px 28px rgba(32,40,33,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, boxSizing: "border-box" }}>{n.t}</div>
        );
      })}
      <div style={{ position: "absolute", left: 90, bottom: 60, fontSize: 28, color: C.muted, fontFamily: FONT, maxWidth: 1100, lineHeight: 1.35 }}>
        Mask prompts chosen per damage type · code checks + vision cross-check · swappable rule packs: US estimate, cited Swiss table
      </div>
    </Backdrop>
  );
};

/** Abspann. */
const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 200 } });
  return (
    <Backdrop>
      <VO file="08-outro.mp3" />
      <div style={{ position: "absolute", left: 140, top: 260, transform: `translateY(${(1 - s) * 30}px)`, opacity: s, fontFamily: FONT }}>
        <Title size={130} color={C.green}>Fair Deposit</Title>
        <div style={{ fontSize: 46, fontWeight: 600, color: C.ink, marginTop: 24 }}>Finally, evidence.</div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 44, lineHeight: 1.5 }}>
          fair-deposit-73nv.vercel.app<br />github.com/Felipe3052/fair-deposit
        </div>
        <div style={{ fontSize: 22, color: C.muted, marginTop: 40 }}>Not legal advice · Built during the hackathon · Demo photos partly synthetic</div>
      </div>
      <div style={{ position: "absolute", left: 1170, top: 280 }}>
        <MascotStatic size={520} at={14} />
      </div>
    </Backdrop>
  );
};

export const Demo: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <Sequence {...scene("hook", "stack")}><Fade durationInFrames={dur("hook", "stack")}><Hook /></Fade></Sequence>
    <Sequence {...scene("stack", "agent")}><Fade durationInFrames={dur("stack", "agent")}><Stack /></Fade></Sequence>
    <Sequence {...scene("agent", "compare")}><Fade durationInFrames={dur("agent", "compare")}><Agent /></Fade></Sequence>
    <Sequence {...scene("compare", "calc")}><Fade durationInFrames={dur("compare", "calc")}><Compare /></Fade></Sequence>
    <Sequence {...scene("calc", "letter")}><Fade durationInFrames={dur("calc", "letter")}><Calc /></Fade></Sequence>
    <Sequence {...scene("letter", "arch")}><Fade durationInFrames={dur("letter", "arch")}><Letter /></Fade></Sequence>
    <Sequence {...scene("arch", "outro")}><Fade durationInFrames={dur("arch", "outro")}><Arch /></Fade></Sequence>
    <Sequence {...scene("outro", "end")}><Fade durationInFrames={dur("outro", "end")}><Outro /></Fade></Sequence>
  </AbsoluteFill>
);
