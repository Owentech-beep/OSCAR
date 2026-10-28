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
  const expected = req.session?.csrfToken;

  if (
    typeof supplied !== "string" ||
    typeof expected !== "string" ||
    !/^[a-f0-9]{64}$/i.test(supplied) ||
    !/^[a-f0-9]{64}$/i.test(expected)
  ) {
    if (req.path.startsWith("/api/")) {
      return res.status(403).json({
        success: false,
        error: "Invalid or missing CSRF token.",
      });
    }

    return res.status(403).render("errors/403", {
      title: "Invalid request",
      user: req.session?.user ?? null,
    });
  }

  const valid = crypto.timingSafeEqual(
    Buffer.from(supplied, "hex"),
    Buffer.from(expected, "hex"),
  );

  if (!valid) {
    if (req.path.startsWith("/api/")) {
      return res.status(403).json({
        success: false,
        error: "Invalid or missing CSRF token.",
      });
    }

    return res.status(403).render("errors/403", {
      title: "Invalid request",
      user: req.session?.user ?? null,
    });
  }

  return next();
}