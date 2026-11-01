import { Composition } from "remotion";
import { Demo, TOTAL_FRAMES, FPS } from "./Demo";

export const Root = () => (
  <Composition
    id="Demo"
    component={Demo}
    durationInFrames={TOTAL_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
