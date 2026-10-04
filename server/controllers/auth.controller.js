import { authenticateUser } from "../services/auth.service.js";
import { writeAuditLog } from "../services/audit.service.js";

export function showLogin(req, res) {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }

  return res.render("auth/login", {
    title: "Sign in",
    error: null
  });
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).render("auth/login", {
        title: "Sign in",
        error: "Email and password are required."
      });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return res.status(401).render("auth/login", {
        title: "Sign in",
        error: "Invalid email or password."
      });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    req.session.user = user;

    await writeAuditLog({
      actorUser: user.id,
      action: "auth.login",
      resourceType: "User",
      resourceId: user.id,
      req
    });

    return res.redirect("/dashboard");
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const userId = req.session.user?.id;

    if (userId) {
      await writeAuditLog({
        actorUser: userId,
        action: "auth.logout",
        resourceType: "User",
        resourceId: userId,
        req
      });
    }

    await new Promise((resolve, reject) => {
      req.session.destroy((error) => {
        if (error) reject(error);
        else resolve();
      });
    });

    res.clearCookie("oscar.sid");
    return res.redirect("/login");
  } catch (error) {
    return next(error);
  }
}
