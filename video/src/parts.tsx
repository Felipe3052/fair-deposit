import { Easing, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "./theme";

/** Kurze Textmarke unten links (≈2,3 s): fade + leichter Aufstieg, ohne Überschwingen. */
export const Chip: React.FC<{ text: string; at: number; duration?: number; n?: number }> = ({ text, at, duration = 70, n }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 12, at + duration - 12, at + duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  if (o <= 0.01) return null;
  return (
    <div style={{ position: "absolute", left: 70, bottom: 86, display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.96)", borderRadius: 18, padding: "12px 24px 12px 14px", fontFamily: FONT, fontSize: 32, fontWeight: 700, color: C.ink, boxShadow: "0 10px 30px rgba(32,40,33,0.2)", opacity: o, transform: `translateY(${(1 - o) * 16}px)` }}>
      {n !== undefined && <span style={{ width: 40, height: 40, borderRadius: 20, background: C.green, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{n}</span>}
      {text}
    </div>
  );
};

/** Pflicht-Hinweis (Demo-Fotos teils synthetisch / aufgezeichneter Lauf), dezent unten links. */
export const Disclosure: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", right: 40, bottom: 24, fontFamily: FONT, fontSize: 20, fontWeight: 500, color: "#fff", background: "rgba(32,40,33,0.55)", padding: "4px 12px", borderRadius: 8 }}>{text}</div>
);

export const Backdrop: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", inset: 0, background: `radial-gradient(1200px 700px at 85% 10%, #e7efe3 0%, ${C.bg} 60%)`, fontFamily: FONT }}>{children}</div>
);

export const Fade: React.FC<{ children: React.ReactNode; dur?: number; durationInFrames: number }> = ({ children, dur = 8, durationInFrames }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, dur, durationInFrames - dur, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <div style={{ position: "absolute", inset: 0, opacity: o }}>{children}</div>;
};
