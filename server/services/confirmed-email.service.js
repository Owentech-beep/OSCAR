export async function executeConfirmedEmail(
  payload,
  { Email, sendEmail, markEmailAsSent, assertEmailConfigured },
) {
  const action = "send_email";
  const { emailId, approvedEmail } = payload;

  const fail = (error) => ({ success: false, action, error });

  const email = await Email.findById(emailId);

  if (!email) {
    return fail("Email draft not found.");
  }

  if (email.status !== "draft") {
    return fail(
      `Email cannot be sent because its status is "${email.status}".`,
    );
  }

  if (
    !approvedEmail ||
    email.to !== approvedEmail.to ||
    email.subject !== approvedEmail.subject ||
    email.body !== approvedEmail.body
  ) {
    return fail(
      "The email draft changed or this confirmation is outdated. " +
        "Review the draft and request a new confirmation.",
    );
  }

  // Configuration errors must not move the draft into sending.
  assertEmailConfigured();

  const claimedEmail = await Email.findOneAndUpdate(
    {
      _id: emailId,
      direction: "outbound",
      status: "draft",
      to: approvedEmail.to,
      subject: approvedEmail.subject,
      body: approvedEmail.body,
    },
    {
      $set: {
        status: "sending",
        sendingAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!claimedEmail) {
    return fail(
      "The email changed, was scheduled, or is already being sent. " +
        "Refresh its status before continuing.",
    );
  }

  const providerResult = await sendEmail({
    to: approvedEmail.to,
    subject: approvedEmail.subject,
    body: approvedEmail.body,
  });

  const sentEmail = await markEmailAsSent(emailId, providerResult.messageId);

  return {
    success: true,
    action,
    email: {
      id: sentEmail._id.toString(),
      to: sentEmail.to,
      subject: sentEmail.subject,
      status: sentEmail.status,
      sentAt: sentEmail.sentAt,
      providerMessageId: sentEmail.providerMessageId,
    },
  };
}
