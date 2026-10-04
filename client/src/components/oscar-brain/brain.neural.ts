import * as THREE from "three";

export function calculateNeuralPulse(
  time: number,
  position: THREE.Vector3,
  activity: number,
): number {
  const normalizedActivity = THREE.MathUtils.clamp(
    activity,
    0,
    1,
  );

  const travelSpeed =
    1.4 + normalizedActivity * 2.8;

  const primaryWave =
    Math.sin(
      position.x * 2.6 +
        position.y * 0.8 +
        time * travelSpeed,
    ) *
      0.5 +
    0.5;

  const secondaryWave =
    Math.sin(
      position.z * 3.2 -
        time * (1.2 + normalizedActivity * 2),
    ) *
      0.5 +
    0.5;

  const travellingWave =
    Math.sin(
      (position.x + position.z) * 2.1 -
        time * (1.8 + normalizedActivity * 2.5),
    ) *
      0.5 +
    0.5;

  return THREE.MathUtils.clamp(
    primaryWave * 0.45 +
      secondaryWave * 0.2 +
      travellingWave * 0.35,
    0,
    1,
  );
}