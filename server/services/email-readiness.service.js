export function isEmailConfigured(config) {
  return Boolean(
    typeof config?.RESEND_API_KEY === "string" &&
    config.RESEND_API_KEY.trim() &&
    typeof config?.RESEND_FROM_EMAIL === "string" &&
    config.RESEND_FROM_EMAIL.trim()
  );
}

export function assertEmailConfigured(config) {
  if (!isEmailConfigured(config)) {
    const error = new Error(
      "Email is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );

    error.statusCode = 503;
    error.code = "EMAIL_NOT_CONFIGURED";

    throw error;
  }
}