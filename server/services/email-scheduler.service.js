import { claimScheduledEmail } from "./email.service.js";

import { sendEmail } from "../integrations/email.provider.js";
import { markEmailAsSent } from "./email-send.service.js";
import Email from "../models/Email.js";

let schedulerInterval = null;
let isProcessing = false;

async function processScheduledEmail() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  try {
    const email = await claimScheduledEmail();

    if (!email) {
      return;
    }

    try {
      const providerResult = await sendEmail({
        to: email.to,
        subject: email.subject,
        body: email.body,
      });

      await markEmailAsSent(email._id, providerResult.messageId);

      console.log(`Scheduled email sent: ${email._id.toString()}`);
    } catch (error) {
      console.error(
        `Scheduled email requires delivery review: ${email._id.toString()}`,
        error,
      );

      try {
        await Email.updateOne(
          {
            _id: email._id,
            status: "sending",
          },
          {
            $set: {
              "metadata.deliveryReviewRequired": true,
              "metadata.deliveryError": error.message,
              "metadata.deliveryErrorAt": new Date(),
            },
          },
          {
            runValidators: true,
          },
        );
      } catch (recordError) {
        console.error(
          "Could not record the email delivery review details:",
          recordError,
        );
      }
    }
  } finally {
    isProcessing = false;
  }
}

export function startEmailScheduler({ intervalMs = 30_000 } = {}) {
  if (schedulerInterval) {
    return;
  }

  console.log(`Email scheduler started. Checking every ${intervalMs / 1000}s.`);

  schedulerInterval = setInterval(() => {
    processScheduledEmail().catch((error) => {
      console.error("Scheduled email processing failed:", error);
    });
  }, intervalMs);

  processScheduledEmail().catch((error) => {
    console.error("Initial email scheduler check failed:", error);
  });
}

export function stopEmailScheduler() {
  if (!schedulerInterval) {
    return;
  }

  clearInterval(schedulerInterval);
  schedulerInterval = null;

  console.log("Email scheduler stopped.");
}
