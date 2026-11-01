import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "./theme";

/**
 * Das Muse-Maskottchen: federnder Auftritt, ständiges leichtes Wippen, optional Sprechblase
 * und "Hüpfer" (bounceAt = Frames innerhalb der Szene), z. B. wenn $144 erscheint.
 */
export const Mascot: React.FC<{
  size?: number;
  delay?: number;
  bubble?: string;
  bubbleDelay?: number;
  bounceAt?: number[];
  flip?: boolean;
  tilt?: number;
}> = ({ size = 260, delay = 0, bubble, bubbleDelay = 18, bounceAt = [], flip = false, tilt = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 110 } });
  const bob = Math.sin((frame / fps) * Math.PI * 1.4) * 7;
  const sway = Math.sin((frame / fps) * Math.PI * 0.9) * 2.2 + tilt;
  const hop = bounceAt.reduce((sum, b) => {
    const f = frame - b;
    return f < 0 || f > 22 ? sum : sum + Math.abs(Math.sin((f / 22) * Math.PI)) * -46 * (1 - f / 28);
  }, 0);
  const scale = interpolate(enter, [0, 1], [0.2, 1]);
  const bubbleIn = spring({ frame: frame - delay - bubbleDelay, fps, config: { damping: 14, stiffness: 130 } });

  return (
    <div style={{ position: "relative", width: size, fontFamily: FONT }}>
      {bubble && (
        <div
          style={{
            position: "absolute", bottom: size * 0.92, left: "50%", width: Math.min(size * 1.25, 248),
            transform: `translateX(-50%) scale(${bubbleIn}) translateY(${(1 - bubbleIn) * 20}px)`,
            transformOrigin: "50% 100%", background: C.card, borderRadius: 26, padding: "16px 20px",
            fontSize: 26, lineHeight: 1.25, fontWeight: 600, color: C.ink, textAlign: "center",
            boxShadow: "0 10px 30px rgba(32,40,33,0.16)", border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {bubble}
          <div style={{ position: "absolute", left: "50%", bottom: -12, width: 24, height: 24, background: C.card, transform: "translateX(-50%) rotate(45deg)", borderRight: "1px solid rgba(0,0,0,0.06)", borderBottom: "1px solid rgba(0,0,0,0.06)" }} />
        </div>
      )}
      <Img
        src={staticFile("inspector.webp")}
        style={{
          width: size, height: size, display: "block",
          transform: `translateY(${bob + hop + (1 - enter) * 120}px) rotate(${sway}deg) scale(${scale}) scaleX(${flip ? -1 : 1})`,
          filter: "drop-shadow(0 14px 18px rgba(32,40,33,0.18))",
        }}
      />
    </div>
  );
};
