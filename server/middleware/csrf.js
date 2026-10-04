import crypto from "node:crypto";

export function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
}

export function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const supplied = req.body?._csrf || req.get("x-csrf-token");
  const expected = req.session.csrfToken;

  if (!expected || !supplied || !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) {
    return res.status(403).render("errors/403", {
      title: "Invalid request",
      user: req.session?.user ?? null
    });
  }

  return next();
}
