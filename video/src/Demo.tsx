import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Box, Caption, Fade, Footage, Gutter, StepCard } from "./parts";
import { Mascot } from "./Mascot";
import { C, FONT } from "./theme";

export const FPS = 30;
const sec = (s: number) => Math.round(s * FPS);

// Szenengrenzen nach docs/VOICEOVER.md (Sekunden)
const T = { hook: 0, stack: 14, agent: 28, compare: 70, calc: 100, letter: 135, arch: 155, outro: 172, end: 180 };
export const TOTAL_FRAMES = sec(T.end);
const scene = (a: keyof typeof T, b: keyof typeof T) => ({ from: sec(T[a]), durationInFrames: sec(T[b] - T[a]) });

const Title: React.FC<{ children: React.ReactNode; size?: number; color?: string }> = ({ children, size = 84, color = C.ink }) => (
  <div style={{ fontSize: size, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, color, fontFamily: FONT }}>{children}</div>
);

/** 0:00 Hook: Hero-Footage mit Maskottchen, das die Frage stellt. */
const Hook = () => (
  <Backdrop>
    <Footage from={2.2} to={4.8} zoomTo={1.04} originX={30} originY={20}>
      <Box x={104} y={116} w={620} h={120} at={80} until={380} color={C.rust} label="The claim" />
    </Footage>
    <Gutter>
      <Mascot size={230} delay={10} bubble="Is that fair?" bubbleDelay={30} bounceAt={[120, 250]} />
    </Gutter>
    <Caption text="A move-out inspection agent for tenants, built on Meta's Muse Spark and SAM 3.1" />
  </Backdrop>
);

/** 0:14 Stack-Folie. */
const Stack = () => {
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
      <div style={{ position: "absolute", left: 110, top: 100 }}>
        <Title>Built on Meta's models</Title>
        <div style={{ marginTop: 56, display: "grid", gap: 22, width: 1180 }}>
          {items.map((it, i) => {
            const s = spring({ frame: frame - 40 - i * 36, fps, config: { damping: 14, stiffness: 100 } });
            return (
              <div key={it.t} style={{ opacity: s, transform: `translateX(${(1 - s) * 90}px)`, background: C.card, borderRadius: 24, padding: "26px 34px", display: "flex", alignItems: "center", gap: 28, boxShadow: "0 10px 30px rgba(32,40,33,0.1)" }}>
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
      <div style={{ position: "absolute", left: 1400, top: 560 }}>
        <Mascot size={360} delay={8} bubble="Every step is real" bubbleDelay={40} bounceAt={[40 + 36 * 3]} tilt={-3} />
      </div>
      <div style={{ position: "absolute", left: 110, bottom: 52, fontSize: 24, color: C.muted, fontFamily: FONT }}>The next scenes are a recorded run of a real agent session.</div>
    </Backdrop>
  );
};

/** 0:28 Agent live (Replay 4.3-21.7 s auf 42 s gestreckt). */
const Agent = () => (
  <Backdrop>
    <Footage from={5.1} to={22.4} rate={0.412} />
    <Gutter>
      <StepCard n={1} text="Spark inspects and zooms" at={sec(4)} />
      <StepCard n={2} text="SAM 3.1 draws proof masks" at={sec(15)} />
      <StepCard n={3} text="Second look rejects false alarms" at={sec(27)} />
      <Mascot size={190} delay={6} bounceAt={[sec(4), sec(15), sec(27), sec(38)]} />
    </Gutter>
    <Caption text="Recorded run · 22 model calls · 58 s · demo photos partly synthetic (Muse Image)" />
  </Backdrop>
);

/** 1:10 Einzugsvergleich. */
const Compare = () => (
  <Backdrop>
    <Footage from={34.6} to={38.6} rate={0.4} zoomTo={1.08} originX={50} originY={25} />
    <Gutter>
      <StepCard n={1} text="Compare with move-in photos" at={sec(2)} />
      <StepCard n={2} text="Floor was already scratched" at={sec(12)} />
      <Mascot size={210} delay={6} bounceAt={[sec(12), sec(22)]} />
    </Gutter>
    <Caption text="Move-in vs move-out: the scratched floor was already there, so the tenant owes $0" />
  </Backdrop>
);

/** 1:40 Rechnung. */
const Calc = () => (
  <Backdrop>
    <Footage from={25.5} to={26.5} rate={1} zoomTo={1.0}>
      <Box x={106} y={176} w={400} h={108} at={sec(2)} until={sec(7)} color={C.rust} label="Landlord claims" />
      <Box x={520} y={176} w={400} h={108} at={sec(7)} until={sec(12)} color={C.green} label="Your fair share" />
      <Box x={100} y={338} w={1240} h={124} at={sec(12)} until={sec(19)} color={C.rust} label="Paint: 3.8 of 5 years, 24% residual, $144" />
      <Box x={100} y={462} w={1240} h={104} at={sec(19)} until={sec(25)} color={C.blue} label="Already at move-in: $0" />
      <Box x={100} y={566} w={1240} h={94} at={sec(25)} until={sec(30)} color={C.sage} label="No evidence: $0" />
    </Footage>
    <Gutter>
      <StepCard n={1} text="Rules are data" at={sec(12)} />
      <StepCard n={2} text="Math is code, recomputed and verified" at={sec(19)} />
      <Mascot size={200} delay={6} bounceAt={[sec(8), sec(30)]} />
    </Gutter>
    <Caption text="$1,800 claimed, $144 owed. Numbers are computed in code, never by the model." />
  </Backdrop>
);

/** 2:15 Brief. */
const Letter = () => (
  <Backdrop>
    <Footage from={41.1} to={46.5} rate={0.4} zoomTo={1.05} originX={50} originY={20}>
      <Box x={1146} y={42} w={172} h={38} at={sec(10)} until={sec(19)} color={C.green} label="Evidence report (PDF)" />
    </Footage>
    <Gutter>
      <StepCard n={1} text="Reply letter with the evidence" at={sec(2)} />
      <StepCard n={2} text="Edit anything, then send" at={sec(11)} />
      <Mascot size={200} delay={6} bounceAt={[sec(14)]} />
    </Gutter>
    <Caption text="The agent finishes the job: a reply to the landlord and a PDF evidence report" />
  </Backdrop>
);

/** 2:35 Architektur. */
const Arch = () => {
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
      <div style={{ position: "absolute", left: 90, top: 60 }}><Title size={64}>How it works</Title></div>
      <svg style={{ position: "absolute", inset: 0 }} width={1920} height={1080}>
        {lines.map(([x1, y1, x2, y2], i) => {
          const p = interpolate(frame, [30 + i * 9, 50 + i * 9], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p} stroke={C.sage} strokeWidth={4} strokeLinecap="round" />;
        })}
      </svg>
      {nodes.map((n, i) => {
        const s = spring({ frame: frame - 14 - i * 12, fps, config: { damping: 14, stiffness: 120 } });
        return (
          <div key={i} style={{ position: "absolute", left: n.x, top: n.y, width: n.w, minHeight: 92, borderRadius: 22, background: C.card, border: `4px solid ${n.c}`, padding: "16px 20px", fontSize: 30, fontWeight: 700, color: C.ink, whiteSpace: "pre-line", textAlign: "center", opacity: s, transform: `scale(${0.8 + 0.2 * s})`, boxShadow: "0 10px 28px rgba(32,40,33,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, boxSizing: "border-box" }}>{n.t}</div>
        );
      })}
      <div style={{ position: "absolute", left: 90, bottom: 60, fontSize: 28, color: C.muted, fontFamily: FONT, maxWidth: 1100, lineHeight: 1.35 }}>
        Mask prompts chosen per damage type · code checks + vision cross-check · swappable rule packs: US estimate, cited Swiss table
      </div>
      <div style={{ position: "absolute", left: 1500, top: 760 }}>
        <Mascot size={260} delay={90} bounceAt={[150]} tilt={3} flip />
      </div>
    </Backdrop>
  );
};

/** 2:52 Abspann. */
const Outro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 90 } });
  return (
    <Backdrop>
      <div style={{ position: "absolute", left: 140, top: 260, transform: `translateY(${(1 - s) * 40}px)`, opacity: s, fontFamily: FONT }}>
        <Title size={130} color={C.green}>Fair Deposit</Title>
        <div style={{ fontSize: 46, fontWeight: 600, color: C.ink, marginTop: 24 }}>Finally, evidence.</div>
        <div style={{ fontSize: 30, color: C.muted, marginTop: 44, lineHeight: 1.5 }}>
          fair-deposit-73nv.vercel.app<br />github.com/Felipe3052/fair-deposit
        </div>
        <div style={{ fontSize: 22, color: C.muted, marginTop: 40 }}>Not legal advice · Built during the hackathon · Demo photos partly synthetic</div>
      </div>
      <div style={{ position: "absolute", left: 1170, top: 280 }}>
        <Mascot size={520} delay={14} bounceAt={[70, 130]} />
      </div>
    </Backdrop>
  );
};

export const Demo: React.FC<{ voice: string | null }> = ({ voice }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    {voice && <Audio src={staticFile(voice)} />}
    <Sequence {...scene("hook", "stack")}><Fade><Hook /></Fade></Sequence>
    <Sequence {...scene("stack", "agent")}><Fade><Stack /></Fade></Sequence>
    <Sequence {...scene("agent", "compare")}><Fade><Agent /></Fade></Sequence>
    <Sequence {...scene("compare", "calc")}><Fade><Compare /></Fade></Sequence>
    <Sequence {...scene("calc", "letter")}><Fade><Calc /></Fade></Sequence>
    <Sequence {...scene("letter", "arch")}><Fade><Letter /></Fade></Sequence>
    <Sequence {...scene("arch", "outro")}><Fade><Arch /></Fade></Sequence>
    <Sequence {...scene("outro", "end")}><Fade><Outro /></Fade></Sequence>
  </AbsoluteFill>
);
