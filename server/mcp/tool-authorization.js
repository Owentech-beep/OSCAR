import { assertCanPerformAction } from "../services/authorization.service.js";

export function authorizeMcpTool(principal, action) {
  assertCanPerformAction(principal, action);
  return true;
}