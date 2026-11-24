import { Composition } from "remotion";
import { AmbientLoop } from "./AmbientLoop.jsx";

export const defaultProps = {
  image: "background.png",
  width: 1920,
  height: 1080,
  fps: 30,
  loopSeconds: 20,
  overlays: {
    fog: { color: "#e8eff3", opacity: 0.28 },
    particles: { kind: "snow", count: 220 },
    stars: false,
    aurora: false,
    rays: false,
    grain: 0.05,
    vignette: 0.35,
    zoom: 0.04,
    breathe: 0.03,
  },
};

export const Root = () => (
  <Composition
    id="AmbientLoop"
    component={AmbientLoop}
    defaultProps={defaultProps}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={900}
    calculateMetadata={({ props }) => ({
      width: props.width,
      height: props.height,
      fps: props.fps,
      durationInFrames: Math.round(props.loopSeconds * props.fps),
    })}
  />
);
