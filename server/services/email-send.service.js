import Email from "../models/Email.js";

export async function markEmailAsSent(emailId, providerMessageId = null) {
  const email = await Email.findByIdAndUpdate(
    emailId,
    {
      status: "sent",
      type: "sent",
      sentAt: new Date(),
      providerMessageId,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!email) {
    const error = new Error("Email not found.");
    error.statusCode = 404;
    throw error;
  }

  return email;
}
