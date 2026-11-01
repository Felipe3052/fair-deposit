import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, FONT } from "./theme";

/**
 * Maskottchen-Auftritt ("Beat") an Übergängen: wächst kurz groß ins Bild, zeigt einen kurzen Satz und verschwindet wieder.
 * Kein Wippen, kein Hüpfen, kein Dauer-Tanz. Ein Auftritt dauert ~2 s.
 */
export const MascotBeat: React.FC<{
  at: number;
  text?: string;
  duration?: number;
  size?: number;
  right?: number;
  bottom?: number;
  flip?: boolean;
}> = ({ at, text, duration = 66, size = 300, right = 70, bottom = 60, flip = false }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > duration) return null;
  const inn = interpolate(t, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const out = interpolate(t, [duration - 14, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const k = Math.min(inn, out);
  const bubbleIn = interpolate(t, [10, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const bubble = Math.min(bubbleIn, out);
  return (
    <div style={{ position: "absolute", right, bottom, width: size, height: size, fontFamily: FONT, opacity: k, transform: `translateY(${(1 - k) * 80}px) scale(${0.6 + 0.4 * k})`, transformOrigin: "50% 100%" }}>
      {text && (
        <div style={{ position: "absolute", bottom: size * 0.88, right: size * 0.25, background: C.card, borderRadius: 26, padding: "14px 24px", fontSize: 34, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", boxShadow: "0 12px 32px rgba(32,40,33,0.18)", opacity: bubble, transform: `translateY(${(1 - bubble) * 14}px)` }}>
          {text}
          <div style={{ position: "absolute", right: 46, bottom: -11, width: 22, height: 22, background: C.card, transform: "rotate(45deg)" }} />
        </div>
      )}
      <Img src={staticFile("inspector.webp")} style={{ width: size, height: size, display: "block", transform: `scaleX(${flip ? -1 : 1})`, filter: "drop-shadow(0 16px 20px rgba(32,40,33,0.2))" }} />
    </div>
  );
};

/** Ruhiges Endkarten-Maskottchen (nur Einblenden, kein Dauer-Tanz). */
export const MascotStatic: React.FC<{ size: number; at?: number }> = ({ size, at = 10 }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <Img src={staticFile("inspector.webp")} style={{ width: size, height: size, display: "block", opacity: o, transform: `translateY(${(1 - o) * 40}px)`, filter: "drop-shadow(0 16px 20px rgba(32,40,33,0.2))" }} />
  );
};
