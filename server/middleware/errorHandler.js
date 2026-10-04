export function notFound(req, res) {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      success: false,
      error: "Route not found"
    });
  }

  return res.status(404).render("errors/404", {
    title: "Page not found",
    user: req.session?.user ?? null
  });
}

export function errorHandler(error, req, res, next) {
  console.error(error);

  if (res.headersSent) {
    return next(error);
  }

  const status = error.statusCode || 500;

  if (req.path.startsWith("/api/")) {
    return res.status(status).json({
      success: false,
      error:
        process.env.NODE_ENV === "production"
          ? "An unexpected server error occurred."
          : error.message
    });
  }

  return res.status(status).render("errors/500", {
    title: "Server error",
    user: req.session?.user ?? null
  });
}
