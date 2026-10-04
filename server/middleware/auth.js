export function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  return next();
}

export function requireApiAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }

  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render("errors/403", {
        title: "Access denied",
        user: req.session.user
      });
    }

    return next();
  };
}
