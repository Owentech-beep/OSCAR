import crypto from "node:crypto";
import { User } from "../models/User.js";
import { env } from "../config/env.js";

function getBearerToken(req) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export async function authenticateMcpRequest(req, res, next) {
  try {
    const providedToken = getBearerToken(req);

    if (!providedToken) {
      return res.status(401).json({
        success: false,
        error: "MCP authentication required.",
      });
    }

    const expectedToken = Buffer.from(env.MCP_AUTH_TOKEN);
    const receivedToken = Buffer.from(providedToken);

    if (
      expectedToken.length !== receivedToken.length ||
      !crypto.timingSafeEqual(expectedToken, receivedToken)
    ) {
      return res.status(401).json({
        success: false,
        error: "Invalid MCP credentials.",
      });
    }

    const user = await User.findById(env.MCP_AUTH_USER_ID)
      .select("_id name email role active")
      .lean();

    if (!user || !user.active) {
      return res.status(403).json({
        success: false,
        error: "MCP user is inactive or unavailable.",
      });
    }

    req.mcpPrincipal = {
      type: "service",
      source: "mcp",
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
