import { ActivityLog } from "../models/ActivityLog.js";

export async function writeAuditLog({
  actorUser,
  action,
  resourceType,
  resourceId,
  metadata = {},
  req
}) {
  return ActivityLog.create({
    actorUser,
    action,
    resourceType,
    resourceId,
    metadata,
    ipAddress: req?.ip,
    userAgent: req?.get("user-agent")
  });
}
