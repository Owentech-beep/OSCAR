export function createToolContext(req) {
  if (!req?.session?.user) {
    throw new Error("Authentication required");
  }

  return {
    userId: req.session.user.id,
    role: req.session.user.role,
  };
}

export function requireToolContext(runContext) {
  const context = runContext?.context;

  if (!context?.userId || !context?.role) {
    return {
      success: false,
      error: "Authenticated tool context is missing.",
    };
  }

  return {
    success: true,
    userId: context.userId,
    role: context.role,
  };
}