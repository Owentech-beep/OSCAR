import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { authenticateMcpRequest } from "./auth.js";
import { createMcpServer } from "./server.js";
import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import crypto from "node:crypto";

const app = express();

app.use(express.json());

const transports = new Map();

app.post("/mcp", authenticateMcpRequest, async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];

    let transport = sessionId
      ? transports.get(sessionId)
      : undefined;

    if (!transport && !sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (newSessionId) => {
          transports.set(newSessionId, transport);
        },
      });

      transport.onclose = () => {
        const currentSessionId = transport.sessionId;

        if (currentSessionId) {
          transports.delete(currentSessionId);
        }
      };
      const mcpServer = createMcpServer(req.mcpPrincipal);
      await mcpServer.connect(transport);
    }

    if (!transport) {
      res.status(400).json({
        error: "Invalid or missing MCP session.",
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP request error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal MCP server error.",
      });
    }
  }
});

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "OSCAR MCP",
    status: "online",
  });
});

await connectDatabase();

app.listen(env.MCP_PORT || 4000, () => {
  console.log(
    `OSCAR MCP is running at http://localhost:${env.MCP_PORT || 4000}`,
  );
});
