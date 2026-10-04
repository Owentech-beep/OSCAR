export type OscarBrainState =
  | "idle"
  | "listening"
  | "thinking"
  | "processing"
  | "tool_call"
  | "success"
  | "warning"
  | "error"
  | "offline";

export interface OscarBrainProps {
  state?: OscarBrainState;
  activity?: number;
  intensity?: number;
  interactive?: boolean;
  className?: string;
}