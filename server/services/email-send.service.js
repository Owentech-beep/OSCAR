import Email from "../models/Email.js";

export async function markEmailAsSent(emailId, providerMessageId = null) {
  if (
    typeof providerMessageId !== "string" ||
    !providerMessageId.trim()
  ) {
    const error = new Error(
      "Provider acceptance could not be verified. " +
      "Review the delivery attempt before retrying.",
    );
    error.statusCode = 502;
    throw error;
  }

  const email = await Email.findOneAndUpdate(
    {
      _id: emailId,
      status: "sending",
    },
    {
      $set: {
        status: "sent",
        type: "sent",
        sentAt: new Date(),
        providerMessageId,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!email) {
    const error = new Error(
      "Could not record provider acceptance: " +
      "the email is missing or no longer in sending status.",
    );
    error.statusCode = 409;
    throw error;
  }

  return email;
}