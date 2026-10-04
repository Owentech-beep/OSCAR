import * as THREE from "three";

export interface BrainActivity {
  pulse: number;
  energy: number;
  rotation: number;
  glow: number;
  neuralWave: number;
}

export function calculateBrainActivity(
  time: number,
  activity: number,
  intensity: number,
  pulseSpeed: number,
): BrainActivity {
  const normalizedPulseSpeed = THREE.MathUtils.clamp(pulseSpeed, 0.5, 3);
  const normalizedActivity = THREE.MathUtils.clamp(activity, 0, 1);

  const normalizedIntensity = THREE.MathUtils.clamp(intensity, 0, 1);

  /*
   * Higher activity produces slightly faster
   * and more noticeable breathing.
   */
  const pulseAmount = 0.008 + normalizedActivity * 0.025;

  const pulse =
    1 +
    Math.sin(time * normalizedPulseSpeed * (1.2 + normalizedActivity * 1.8)) *
      pulseAmount;
  /*
   * Overall neural energy.
   */
  const energy =
    normalizedActivity *
    normalizedIntensity *
    (0.65 + Math.sin(time * 2.4) * 0.35);

  /*
   * Very subtle organic movement.
   */
  const rotation = Math.sin(time * 0.35) * (0.008 + normalizedActivity * 0.012);

  /*
   * Base glow.
   */
  const glow = 0.25 + energy * 0.9;

  /*
   * Travelling neural activity.
   */
  const neuralWave =
    (Math.sin(time * normalizedPulseSpeed * (1.2 + normalizedActivity * 1.8)) +
      1) /
    2;

  return {
    pulse,
    energy,
    rotation,
    glow,
    neuralWave,
  };
}
