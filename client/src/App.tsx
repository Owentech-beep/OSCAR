import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import OscarBrain from "./components/oscar-brain/OscarBrain";
import type { OscarBrainState } from "./components/oscar-brain/brain.types";

function App() {
  const [brainState, setBrainState] = useState<OscarBrainState>("idle");

  useEffect(() => {
    const socket = io({
      withCredentials: true,
      transports: ["polling"],
    });

    socket.on("connect", () => {
      console.log("OSCAR Brain socket connected", {
        id: socket.id,
        connected: socket.connected,
        transport: socket.io.engine.transport.name,
      });
    });

    socket.on("oscar:start", () => {
      setBrainState("thinking");
    });

    socket.on("oscar:thinking", () => {
      setBrainState("thinking");
    });

    socket.on("oscar:tool_call", () => {
      setBrainState("tool_call");
    });

    socket.on("oscar:tool_result", () => {
      setBrainState("processing");
    });

    socket.on("oscar:completed", () => {
      setBrainState("warning");
    });

    socket.on("oscar:confirmation_required", () => {
      setBrainState("warning");
    });

    socket.on("oscar:success", () => {
      setBrainState("success");
    });

    socket.on("oscar:error", () => {
      setBrainState("error");
    });

    socket.on("oscar:offline", () => {
      setBrainState("offline");
    });

    socket.on("connect_error", (error) => {
      console.error("OSCAR Brain socket connection error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("OSCAR Brain socket disconnected:", reason);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return <OscarBrain state={brainState} interactive />;
}

export default App;
