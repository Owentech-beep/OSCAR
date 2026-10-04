import BrainScene from "./BrainScene";
import type { OscarBrainProps } from "./brain.types";
import { brainStateVisuals } from "./brain.state";
import "./brain.css";

export default function OscarBrain({
  state = "idle",
  activity,
  intensity,
  interactive = true,
  className = "",
}: OscarBrainProps) {
  const visual = brainStateVisuals[state];

  const resolvedActivity = activity ?? visual.activity;

  const resolvedIntensity = intensity ?? visual.intensity;

  return (
    <div className={`oscar-brain-3d ${className}`} data-state={state}>
      <BrainScene
        interactive={interactive}
        activity={resolvedActivity}
        intensity={resolvedIntensity}
        pulseSpeed={visual.pulseSpeed}
        energyColor={visual.energyColor}
      />
    </div>
  );
}
