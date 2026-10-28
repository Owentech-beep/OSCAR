import Email from "../models/Email.js";

export async function createEmailDraft({
  leadId,
  to,
  subject,
  body,
  metadata = {},
}) {
  return Email.create({
    lead: leadId,
    direction: "outbound",
    type: "draft",
    to,
    subject,
    body,
    status: "draft",
    metadata,
  });
}

export async function getEmailById(emailId) {
  return Email.findById(emailId).populate(
    "lead",
    "companyName contactName email",
  );
}

export async function getEmails({ page = 1, limit = 20, status = "" } = {}) {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [emails, total] = await Promise.all([
    Email.find(filter)
      .populate("lead", "companyName contactName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Email.countDocuments(filter),
  ]);

  return {
    emails,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLeadEmails(leadId) {
  return Email.find({ lead: leadId }).sort({ createdAt: -1 });
}

export async function scheduleEmail(emailId, scheduledAt) {
  const scheduledDate = new Date(scheduledAt);

  if (Number.isNaN(scheduledDate.getTime())) {
    const error = new Error("Invalid scheduled date.");
    error.statusCode = 400;
    throw error;
  }

  if (scheduledDate <= new Date()) {
    const error = new Error("Scheduled time must be in the future.");
    error.statusCode = 400;
    throw error;
  }

  const email = await Email.findOneAndUpdate(
    {
      _id: emailId,
      direction: "outbound",
      status: "draft",
    },
    {
      $set: {
        status: "scheduled",
        scheduledAt: scheduledDate,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!email) {
    const existing = await Email.findById(emailId)
      .select("status")
      .lean();

    const error = new Error(
      existing
        ? `Email cannot be scheduled from status "${existing.status}".`
        : "Email not found.",
    );

    error.statusCode = existing ? 409 : 404;
    throw error;
  }

  return email;
}

export async function claimScheduledEmail() {
  const now = new Date();

  return Email.findOneAndUpdate(
    {
      status: "scheduled",
      scheduledAt: {
        $lte: now,
      },
    },
    {
      $set: {
        status: "sending",
        sendingAt: now,
      },
    },
    {
      new: true,
      sort: {
        scheduledAt: 1,
      },
    },
  );
}
