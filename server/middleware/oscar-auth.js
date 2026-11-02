import mongoose from "mongoose";
import { User } from "../models/User.js";

export function createOscarAccountMiddleware({ UserModel = User } = {}) {
  return async function requireCurrentOscarAccount(req, res, next) {
    try {
      const userId = req.session?.user?.id;

      if (
        typeof userId !== "string" ||
        !mongoose.isValidObjectId(userId)
      ) {
        return res.status(401).json({
          success: false,
          error: "Authentication required.",
        });
      }

      const account = await UserModel.findById(userId)
        .select("_id role active")
        .lean();

      if (
        !account ||
        account.active !== true ||
        !["owner", "admin", "staff"].includes(account.role)
      ) {
        return res.status(403).json({
          success: false,
          error: "Your account cannot access OSCAR.",
        });
      }

      req.oscarPrincipal = {
        userId: account._id.toString(),
        role: account.role,
        active: account.active,
      };

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

export const requireCurrentOscarAccount =
  createOscarAccountMiddleware();