import { Freeze, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Video, staticFile } from "remotion";
import { C, FONT } from "./theme";

export const S = 1560 / 1440; // Footage (1440 px breit) → 1560 px breite Karte

/** Spielt einen Ausschnitt [from,to] (Sekunden) des Replay-Videos mit Rate und friert danach auf dem letzten Bild ein. */
export const Footage: React.FC<{ from: number; to: number; rate?: number; zoomTo?: number; originX?: number; originY?: number; children?: React.ReactNode }> = ({
  from, to, rate = 1, zoomTo = 1, originX = 50, originY = 50, children,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const playFrames = Math.round(((to - from) / rate) * fps);
  const zoom = interpolate(frame, [0, durationInFrames], [1, zoomTo]);
  return (
    <div style={{ position: "absolute", left: 60, top: 40, width: 1560, height: 975, borderRadius: 22, overflow: "hidden", boxShadow: "0 24px 60px rgba(32,40,33,0.22)", background: "#fff" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${zoom})`, transformOrigin: `${originX}% ${originY}%` }}>
        <Freeze frame={Math.min(frame, playFrames - 1)}>
          <Video src={staticFile("replay.mp4")} startFrom={Math.round(from * fps)} endAt={Math.round(to * fps)} playbackRate={rate} style={{ width: 1560, height: 975 }} muted />
        </Freeze>
        {children}
      </div>
    </div>
  );
};

/** Umrandung auf dem Footage (Koordinaten im 1440×900-Raum). */
export const Box: React.FC<{ x: number; y: number; w: number; h: number; at: number; until?: number; color?: string; label?: string }> = ({ x, y, w, h, at, until, color = C.rust, label }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 120 } });
  const out = until ? interpolate(frame, [until - 8, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const o = inn * out;
  if (o <= 0.01) return null;
  return (
    <div style={{ position: "absolute", left: x * S - 8, top: y * S - 8, width: w * S + 16, height: h * S + 16, border: `5px solid ${color}`, borderRadius: 16, opacity: o, transform: `scale(${0.94 + 0.06 * inn})`, boxShadow: `0 0 0 9999px rgba(20,28,22,${0.1 * o})`, pointerEvents: "none" }}>
      {label && (
        <div style={{ position: "absolute", left: 0, ...(y * S < 90 ? { top: h * S + 28 } : { top: -50 }), background: color, color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 24, padding: "6px 16px", borderRadius: 12, whiteSpace: "nowrap" }}>{label}</div>
      )}
    </div>
  );
};

/** Rechte Spalte: Maskottchen-Platz + Schritt-Karten, die nacheinander einfliegen. */
export const Gutter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: 1635, top: 0, width: 270, height: 1080, display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", paddingBottom: 130, gap: 18, fontFamily: FONT }}>
    {children}
  </div>
);

export const StepCard: React.FC<{ n: number; text: string; at: number; until?: number }> = ({ n, text, at, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 110 } });
  const out = until ? interpolate(frame, [until - 10, until], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  const o = inn * out;
  if (o <= 0.01) return null;
  return (
    <div style={{ width: 262, background: C.card, borderRadius: 18, padding: "12px 14px", display: "flex", gap: 10, alignItems: "center", fontSize: 21, fontWeight: 600, color: C.ink, boxShadow: "0 8px 24px rgba(32,40,33,0.14)", opacity: o, transform: `translateX(${(1 - inn) * 60}px)` }}>
      <span style={{ width: 34, height: 34, borderRadius: 17, background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{n}</span>
      <span style={{ lineHeight: 1.2 }}>{text}</span>
    </div>
  );
};

/** Untertitel unten über dem Footage (Kernaussage je Szene, auch ohne Ton lesbar). */
export const Caption: React.FC<{ text: string; at?: number }> = ({ text, at = 6 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 60, width: 1560, bottom: 8, textAlign: "center", fontFamily: FONT, opacity: o, color: C.muted, fontSize: 22, fontWeight: 500 }}>{text}</div>
  );
};

export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(1200px 700px at 85% 10%, #e7efe3 0%, ${C.bg} 60%)`, fontFamily: FONT }}>{children}</div>
);

export const Fade: React.FC<{ children: React.ReactNode; dur?: number }> = ({ children, dur = 10 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const o = interpolate(frame, [0, dur, durationInFrames - dur, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
};

export { Sequence };
