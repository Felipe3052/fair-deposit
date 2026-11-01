import { Easing, Freeze, Img, OffthreadVideo, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";

/** Rechteck im Koordinatenraum des aufgenommenen Viewports (1440 x 810 CSS-Pixel). */
export type R = { x: number; y: number; width: number; height: number };
export const VIEW = { w: 1440, h: 810 };
const W = 1920;
const H = 1080;

export const union = (...rs: R[]): R => {
  const x1 = Math.min(...rs.map((r) => r.x));
  const y1 = Math.min(...rs.map((r) => r.y));
  const x2 = Math.max(...rs.map((r) => r.x + r.width));
  const y2 = Math.max(...rs.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
};

export type Key = { f: number; cx: number; cy: number; z: number };

/** Kameraziel, das ein Rechteck mit Rand füllt (Zoom höchstens maxZ, damit der 2x-Quelltext scharf bleibt). */
export const fit = (f: number, r: R, opts: { pad?: number; maxZ?: number; minZ?: number } = {}): Key => {
  const { pad = 1.18, maxZ = 1.5, minZ = 1 } = opts;
  const z = Math.min(maxZ, Math.max(minZ, Math.min(VIEW.w / (r.width * pad), VIEW.h / (r.height * pad))));
  return { f, cx: (r.x + r.width / 2) / VIEW.w, cy: (r.y + r.height / 2) / VIEW.h, z };
};
export const wide = (f: number): Key => ({ f, cx: 0.5, cy: 0.5, z: 1 });

const ease = Easing.inOut(Easing.cubic);

/** Virtuelle Kamera: sanfte Fahrten (ease in-out, ohne Überschwingen) zwischen Zielen; Zoom logarithmisch interpoliert. */
export const Camera: React.FC<{ keys: Key[]; children: React.ReactNode }> = ({ keys, children }) => {
  const frame = useCurrentFrame();
  let a = keys[0];
  let b = keys[0];
  let p = 0;
  for (let i = 0; i < keys.length; i++) {
    if (frame >= keys[i].f) {
      a = keys[i];
      b = keys[i + 1] ?? keys[i];
    }
  }
  if (b.f > a.f) p = ease(Math.min(1, Math.max(0, (frame - a.f) / (b.f - a.f))));
  const z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * p);
  const cx = a.cx + (b.cx - a.cx) * p;
  const cy = a.cy + (b.cy - a.cy) * p;
  const tx = Math.min(0, Math.max(W - W * z, W / 2 - cx * W * z));
  const ty = Math.min(0, Math.max(H - H * z, H / 2 - cy * H * z));
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: C.bg }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transformOrigin: "0 0", transform: `translate3d(${tx}px, ${ty}px, 0) scale(${z})`, willChange: "transform" }}>{children}</div>
    </div>
  );
};

/** Aufgenommenes 2x-Video in voller Bühne, mit 1,0x abgespielt (keine Zeitdehnung, kein Ruckeln); friert am Ende ein. */
export const Take: React.FC<{ file: string; frames: number; children?: React.ReactNode }> = ({ file, frames, children }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
      <Freeze frame={Math.min(frame, frames - 1)}>
        <OffthreadVideo src={staticFile(file)} style={{ width: W, height: H, display: "block" }} muted />
      </Freeze>
      {children}
    </div>
  );
};

export const Still: React.FC<{ file: string; children?: React.ReactNode }> = ({ file, children }) => (
  <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H }}>
    <Img src={staticFile(file)} style={{ width: W, height: H, display: "block" }} />
    {children}
  </div>
);

/** Dünne Hervorhebung auf einem Rechteck (Koordinaten wie aufgenommen), sanftes Ein- und Ausblenden, kein Abdunkeln. */
export const Ring: React.FC<{ r: R; at: number; until: number; color?: string; label?: string; labelBelow?: boolean }> = ({ r, at, until, color = C.rust, label, labelBelow }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 10, until - 10, until], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.quad) });
  if (o <= 0.01) return null;
  const k = W / VIEW.w;
  const pad = 8;
  return (
    <div style={{ position: "absolute", left: r.x * k - pad, top: r.y * k - pad, width: r.width * k + pad * 2, height: r.height * k + pad * 2, border: `4px solid ${color}`, borderRadius: 18, opacity: o, boxShadow: `0 0 0 6px ${color}22`, pointerEvents: "none" }}>
      {label && (
        <div style={{ position: "absolute", left: 0, ...(labelBelow ? { top: r.height * k + pad * 2 + 12 } : { top: -52 }), background: color, color: "#fff", fontFamily: FONT, fontWeight: 700, fontSize: 24, padding: "6px 16px", borderRadius: 12, whiteSpace: "nowrap" }}>{label}</div>
      )}
    </div>
  );
};

/** Linke oder rechte Hälfte eines breiten Rechtecks (für gestufte Zooms auf Tabellenzeilen). */
export const part = (r: R, side: "left" | "right", share = 0.56): R =>
  side === "left" ? { ...r, width: r.width * share } : { ...r, x: r.x + r.width * (1 - share), width: r.width * share };

/** Sprechblase am Seiten-Maskottchen (bewegt sich mit der Kamera mit, taucht kurz auf und verschwindet). */
export const Bubble: React.FC<{ near: R; text: string; at: number; duration?: number }> = ({ near, text, at, duration = 66 }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > duration) return null;
  const o = interpolate(t, [0, 12, duration - 12, duration], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const k = W / VIEW.w;
  return (
    <div style={{ position: "absolute", left: (near.x - 60) * k, top: (near.y - 6) * k, background: C.card, borderRadius: 26, padding: "14px 26px", fontFamily: FONT, fontSize: 38, fontWeight: 700, color: C.ink, whiteSpace: "nowrap", boxShadow: "0 12px 32px rgba(32,40,33,0.2)", opacity: o, transform: `translateY(${(1 - o) * 12}px)` }}>
      {text}
      <div style={{ position: "absolute", left: 70, bottom: -11, width: 22, height: 22, background: C.card, transform: "rotate(45deg)" }} />
    </div>
  );
};
