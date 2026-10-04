import type { OscarBrainState } from "./brain.types";

export interface BrainStateVisual {
  activity: number;
  intensity: number;
  pulseSpeed: number;
  energyColor: string;
}

export const brainStateVisuals: Record<
  OscarBrainState,
  BrainStateVisual
> = {
  idle: {
    activity: 0.12,
    intensity: 0.3,
    pulseSpeed: 1,
    energyColor: "#1976ff",
  },

  listening: {
    activity: 0.35,
    intensity: 0.5,
    pulseSpeed: 1.2,
    energyColor: "#2388ff",
  },

  thinking: {
    activity: 0.6,
    intensity: 0.7,
    pulseSpeed: 1.5,
    energyColor: "#2994ff",
  },

  processing: {
    activity: 0.85,
    intensity: 0.85,
    pulseSpeed: 1.8,
    energyColor: "#32a0ff",
  },

  tool_call: {
    activity: 1,
    intensity: 1,
    pulseSpeed: 2.2,
    energyColor: "#42aaff",
  },

  success: {
    activity: 0.8,
    intensity: 0.95,
    pulseSpeed: 2.6,
    energyColor: "#35d07f",
  },

  warning: {
    activity: 0.65,
    intensity: 0.9,
    pulseSpeed: 2.1,
    energyColor: "#ffb52e",
  },

  error: {
    activity: 0.45,
    intensity: 0.85,
    pulseSpeed: 1.7,
    energyColor: "#ff4d5a",
  },

  offline: {
    activity: 0.03,
    intensity: 0.12,
    pulseSpeed: 0.6,
    energyColor: "#31506f",
  },
};